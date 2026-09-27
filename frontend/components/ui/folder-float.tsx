"use client";

/** A small empty-queue affordance adapted from React Bits Folder Float. */
export function FolderFloat() {
  return <div className="folder-float" aria-hidden="true">
    <span className="folder-float__paper folder-float__paper--one" />
    <span className="folder-float__paper folder-float__paper--two" />
    <span className="folder-float__paper folder-float__paper--three" />
    <span className="folder-float__back" />
    <span className="folder-float__front" />
    <span className="folder-float__label">Care team</span>
  </div>;
}
