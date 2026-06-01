import { useRef } from "react";
import {
  createCurrentTauriWindowDragSession,
  type CurrentTauriWindowDragPoint,
  type CurrentTauriWindowDragSession,
} from "../lib/tauriWindow";

type PendingWindowDrag = {
  latestPoint: CurrentTauriWindowDragPoint;
  pointerId: number;
  session: CurrentTauriWindowDragSession | null;
  startPoint: CurrentTauriWindowDragPoint;
};

const getPointerScreenPoint = (event: React.PointerEvent) => ({
  x: event.screenX,
  y: event.screenY,
});

const CompactWindowDragRegion = () => {
  const pendingWindowDragRef = useRef<PendingWindowDrag | null>(null);

  const clearPendingWindowDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const pendingWindowDrag = pendingWindowDragRef.current;

    if (!pendingWindowDrag || pendingWindowDrag.pointerId !== event.pointerId) {
      return;
    }

    pendingWindowDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      aria-hidden="true"
      className="compact-stage__drag-region"
      data-compact-drag-action="move-window"
      data-compact-drag-implementation="pointer-position-session"
      onPointerCancel={clearPendingWindowDrag}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();

        const pendingWindowDrag: PendingWindowDrag = {
          latestPoint: getPointerScreenPoint(event),
          pointerId: event.pointerId,
          session: null,
          startPoint: getPointerScreenPoint(event),
        };

        pendingWindowDragRef.current = pendingWindowDrag;
        event.currentTarget.setPointerCapture(event.pointerId);

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
      }}
      onPointerMove={(event) => {
        const pendingWindowDrag = pendingWindowDragRef.current;

        if (!pendingWindowDrag || pendingWindowDrag.pointerId !== event.pointerId) {
          return;
        }

        pendingWindowDrag.latestPoint = getPointerScreenPoint(event);
        pendingWindowDrag.session?.moveTo(pendingWindowDrag.latestPoint);
      }}
      onPointerUp={clearPendingWindowDrag}
    />
  );
};

export default CompactWindowDragRegion;
