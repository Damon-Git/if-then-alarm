import { useCompactWindowDragSession } from "./useCompactWindowDragSession";

const CompactWindowDragRegion = () => {
  const windowDragSession = useCompactWindowDragSession<HTMLDivElement>();

  return (
    <div
      aria-hidden="true"
      className="compact-stage__drag-region"
      data-compact-drag-action="move-window"
      data-compact-drag-implementation="pointer-position-session"
      onPointerCancel={windowDragSession.onPointerCancel}
      onPointerDown={(event) => {
        event.preventDefault();
        windowDragSession.onPointerDown(event);
      }}
      onPointerMove={windowDragSession.onPointerMove}
      onPointerUp={windowDragSession.onPointerUp}
    />
  );
};

export default CompactWindowDragRegion;
