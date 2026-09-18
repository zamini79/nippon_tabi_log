"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";

type Box = { x: number; y: number; w: number; h: number };

const DRAG_THRESHOLD = 4;

/**
 * SVG viewBox 기반 확대·이동.
 * - 마우스 휠(트랙패드 핀치 포함): 커서 위치를 중심으로 확대/축소. 전체 보기 상태에서 더 축소하려는 휠은 페이지 스크롤로 넘긴다
 * - 확대 상태에서 드래그로 이동. 드래그 뒤에 따라오는 click 은 삼켜서 현/도시 링크가 잘못 열리지 않게 한다
 * - 터치: 두 손가락 핀치로 확대/축소(두 손가락 중심 고정). 한 손가락은 전체 보기에서는 페이지 스크롤(touch-action: pan-y),
 *   확대 뒤에는 지도 이동. 핀치 중·확대 상태의 touchmove 는 preventDefault 로 브라우저 제스처를 막는다
 */
export function useMapZoom(width: number, height: number, maxScale = 8) {
  const full: Box = { x: 0, y: 0, w: width, h: height };
  const [vb, setVbState] = useState<Box>(full);
  const vbRef = useRef<Box>(full);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; sx: number; sy: number; start: Box; k: number; moved: boolean } | null>(null);
  /** 현재 눌린 터치 포인터들 (핀치 판정용) */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /** 핀치 시작 상태: 두 손가락 거리·중심과 그때의 box, 중심에 놓인 지도 좌표 */
  const pinch = useRef<{ dist: number; start: Box; anchor: { x: number; y: number } } | null>(null);
  const swallowClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const anim = useRef<number | null>(null);

  const setVb = useCallback((next: Box) => {
    vbRef.current = next;
    setVbState(next);
  }, []);

  const clampBox = useCallback(
    (b: Box): Box => {
      const w = Math.min(width, Math.max(width / maxScale, b.w));
      const h = (w * height) / width;
      return { w, h, x: Math.min(Math.max(0, b.x), width - w), y: Math.min(Math.max(0, b.y), height - h) };
    },
    [width, height, maxScale],
  );

  // 기준 크기가 바뀌면 전체 보기로
  useEffect(() => {
    setVb({ x: 0, y: 0, w: width, h: height });
  }, [width, height, setVb]);

  /** 화면 좌표 → viewBox 좌표. preserveAspectRatio(meet) 로 생기는 여백을 감안한다 */
  const toViewBox = useCallback((clientX: number, clientY: number, box: Box = vbRef.current) => {
    const el = svgRef.current;
    if (!el) return { x: box.x, y: box.y, k: 1 };
    const r = el.getBoundingClientRect();
    const k = Math.min(r.width / box.w, r.height / box.h);
    const ox = (r.width - box.w * k) / 2;
    const oy = (r.height - box.h * k) / 2;
    return { x: box.x + (clientX - r.left - ox) / k, y: box.y + (clientY - r.top - oy) / k, k };
  }, []);

  /** (cx, cy) viewBox 좌표를 고정한 채 factor 배 확대 */
  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      const prev = vbRef.current;
      const w = Math.min(width, Math.max(width / maxScale, prev.w / factor));
      const ratio = w / prev.w;
      setVb(clampBox({ w, h: (w * height) / width, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio }));
    },
    [width, height, maxScale, clampBox, setVb],
  );

  const zoomCenter = useCallback(
    (factor: number) => {
      const b = vbRef.current;
      zoomAt(factor, b.x + b.w / 2, b.y + b.h / 2);
    },
    [zoomAt],
  );

  /** 현재 box 에서 target 으로 짧게 애니메이션 */
  const animateTo = useCallback(
    (target: Box, ms = 320) => {
      if (anim.current) cancelAnimationFrame(anim.current);
      const from = vbRef.current;
      const t0 = performance.now();
      const step = (now: number) => {
        // 첫 프레임의 timestamp 는 예약 시점(t0)보다 앞설 수 있다 → 음수 t 를 막지 않으면 폭이 음수가 되는 프레임이 생긴다
        const t = Math.max(0, Math.min(1, (now - t0) / ms));
        const e = 1 - Math.pow(1 - t, 3); // ease-out
        setVb({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e });
        if (t < 1) anim.current = requestAnimationFrame(step);
        else anim.current = null;
      };
      anim.current = requestAnimationFrame(step);
    },
    [setVb],
  );

  const reset = useCallback(() => animateTo({ x: 0, y: 0, w: width, h: height }), [width, height, animateTo]);

  /** 경계 상자 [x0,y0,x1,y1] 가 여백(pad, 비율)을 두고 화면에 꽉 차도록 확대 */
  const fitTo = useCallback(
    (bbox: [number, number, number, number], pad = 0.14) => {
      const bw = Math.max(1, bbox[2] - bbox[0]);
      const bh = Math.max(1, bbox[3] - bbox[1]);
      const cx = (bbox[0] + bbox[2]) / 2;
      const cy = (bbox[1] + bbox[3]) / 2;
      let w = bw * (1 + pad * 2);
      let h = bh * (1 + pad * 2);
      if (w / h > width / height) h = (w * height) / width;
      else w = (h * width) / height;
      animateTo(clampBox({ w, h, x: cx - w / 2, y: cy - h / 2 }));
    },
    [width, height, clampBox, animateTo],
  );

  useEffect(() => () => { if (anim.current) cancelAnimationFrame(anim.current); }, []);

  // wheel 은 passive 리스너로는 preventDefault 가 안 되므로 직접 등록
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const cur = vbRef.current;
      const scale = width / cur.w;
      if (e.deltaY > 0 && scale <= 1.0001) return; // 이미 전체 보기 → 페이지 스크롤에 맡김
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; // line 단위(Firefox) 보정
      const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.002)); // ctrlKey: 트랙패드 핀치
      const p = toViewBox(e.clientX, e.clientY, cur);
      zoomAt(factor, p.x, p.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [width, toViewBox, zoomAt]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault(); // 브라우저 핀치/스크롤 대신 우리가 처리
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinch.current || e.touches.length >= 2 || width / vbRef.current.w > 1.0001) e.preventDefault();
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [width]);

  const scale = width / vb.w;
  const zoomed = scale > 1.0001;

  const pinchGeom = () => {
    const [a, b] = [...pointers.current.values()];
    return { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };
  /** anchor(지도 좌표)가 화면의 (cx, cy) 에 오도록 하는, 폭 w 의 box */
  const boxAnchoredAt = (w: number, anchor: { x: number; y: number }, cx: number, cy: number): Box => {
    const el = svgRef.current!;
    const r = el.getBoundingClientRect();
    const h = (w * height) / width;
    const k = Math.min(r.width / w, r.height / h);
    const ox = (r.width - w * k) / 2;
    const oy = (r.height - h * k) / 2;
    return clampBox({ w, h, x: anchor.x - (cx - r.left - ox) / k, y: anchor.y - (cy - r.top - oy) / k });
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        // 두 번째 손가락 → 핀치 시작. 진행 중이던 한 손가락 드래그는 중단
        drag.current = null;
        const g = pinchGeom();
        const anchor = toViewBox(g.cx, g.cy);
        pinch.current = { dist: g.dist, start: vbRef.current, anchor: { x: anchor.x, y: anchor.y } };
        swallowClick.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (pointers.current.size > 2) return;
    }
    if (e.button !== 0 || !zoomed) return;
    const { k } = toViewBox(e.clientX, e.clientY);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, start: vbRef.current, k, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" && pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pz = pinch.current;
      if (pz && pointers.current.size >= 2) {
        const g = pinchGeom();
        const w = Math.min(width, Math.max(width / maxScale, pz.start.w / (g.dist / pz.dist)));
        setVb(boxAnchoredAt(w, pz.anchor, g.cx, g.cy));
        return;
      }
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      swallowClick.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setVb(clampBox({ ...d.start, x: d.start.x - dx / d.k, y: d.start.y - dy / d.k }));
  };
  const endDrag = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      pointers.current.delete(e.pointerId);
      if (pinch.current && pointers.current.size < 2) {
        pinch.current = null;
        // 한 손가락이 남았고 확대 상태면 그 손가락으로 바로 이동을 이어간다
        const rest = [...pointers.current.entries()][0];
        if (rest && width / vbRef.current.w > 1.0001) {
          const [pid, pt] = rest;
          const { k } = toViewBox(pt.x, pt.y);
          drag.current = { id: pid, sx: pt.x, sy: pt.y, start: vbRef.current, k, moved: true };
        }
      }
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
  };
  const onClickCapture = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const style: CSSProperties = {
    touchAction: zoomed ? "none" : "pan-y",
    cursor: zoomed ? (dragging ? "grabbing" : "grab") : undefined,
  };

  return {
    viewBox: `${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
    box: vb,
    scale,
    maxScale,
    zoomed,
    fitTo,
    svgRef,
    svgProps: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture, style },
    zoomIn: () => zoomCenter(1.6),
    zoomOut: () => zoomCenter(1 / 1.6),
    reset,
    toViewBox,
  };
}
