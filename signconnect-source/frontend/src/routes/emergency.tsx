import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/emergency")({
  component: RedirectToBoard,
});

function RedirectToBoard() {
  return <Navigate to="/communication-board" replace />;
}


