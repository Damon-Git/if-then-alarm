import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  createCurrentTauriWindowDragSession,
  type CurrentTauriWindowDragPoint,
  type CurrentTauriWindowDragSession,
} from "../lib/tauriWindow";

type PendingWindowDrag = {
  isSessionRequested: boolean;
  latestPoint: CurrentTauriWindowDragPoint;
  pointerId: number;
  session: CurrentTauriWindowDragSession | null;
  startPoint: CurrentTauriWindowDragPoint;
};

type CompactWindowDragSessionOptions = {
  activationDistance?: number;
  onDragActivated?: () => void;
};

const getPointerScreenPoint = (event: ReactPointerEvent) => ({
  x: event.screenX,
  y: event.screenY,
});

const getPointerDistance = (start: CurrentTauriWindowDragPoint, latest: CurrentTauriWindowDragPoint) =>
  Math.hypot(latest.x - start.x, latest.y - start.y);

export const useCompactWindowDragSession = <Element extends HTMLElement>({
  activationDistance = 0,
  onDragActivated,
}: CompactWindowDragSessionOptions = {}) => {
  const pendingWindowDragRef = useRef<PendingWindowDrag | null>(null);

  const requestWindowDragSession = (pendingWindowDrag: PendingWindowDrag) => {
    if (pendingWindowDrag.isSessionRequested) {
      return;
    }

    pendingWindowDrag.isSessionRequested = true;
    onDragActivated?.();

    createCurrentTauriWindowDragSession(pendingWindowDrag.startPoint)
      .then((session) => {
        if (pendingWindowDragRef.current !== pendingWindowDrag) {
          return;
        }

        pendingWindowDrag.session = session;
        session?.moveTo(pendingWindowDrag.latestPoint);
      })
      .catch(() => {
        if (pendingWindowDragRef.current === pendingWindowDrag) {
          pendingWindowDragRef.current = null;
        }
      });
  };

  const clearPendingWindowDrag = (event: ReactPointerEvent<Element>) => {
    const pendingWindowDrag = pendingWindowDragRef.current;

    if (!pendingWindowDrag || pendingWindowDrag.pointerId !== event.pointerId) {
      return;
    }

    pendingWindowDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return {
    onPointerCancel: clearPendingWindowDrag,
    onPointerDown: (event: ReactPointerEvent<Element>) => {
      if (event.button !== 0) {
        return;
      }

      const point = getPointerScreenPoint(event);
      const pendingWindowDrag: PendingWindowDrag = {
        isSessionRequested: false,
        latestPoint: point,
        pointerId: event.pointerId,
        session: null,
        startPoint: point,
      };

      pendingWindowDragRef.current = pendingWindowDrag;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic browser checks do not register a native active pointer.
      }

      if (activationDistance === 0) {
        requestWindowDragSession(pendingWindowDrag);
      }
    },
    onPointerMove: (event: ReactPointerEvent<Element>) => {
      const pendingWindowDrag = pendingWindowDragRef.current;

      if (!pendingWindowDrag || pendingWindowDrag.pointerId !== event.pointerId) {
        return;
      }

      pendingWindowDrag.latestPoint = getPointerScreenPoint(event);

      if (getPointerDistance(pendingWindowDrag.startPoint, pendingWindowDrag.latestPoint) >= activationDistance) {
        requestWindowDragSession(pendingWindowDrag);
      }

      pendingWindowDrag.session?.moveTo(pendingWindowDrag.latestPoint);
    },
    onPointerUp: clearPendingWindowDrag,
  };
};
