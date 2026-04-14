import React, { ReactNode } from "react";

interface SectionCardProps {
  id: string;
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function SectionCard({
  id,
  title,
  description,
  eyebrow,
  actions,
  children,
}: SectionCardProps) {
  return (
    <section id={id} className="rf-section">
      <div className="rf-section__header">
        <div>
          {eyebrow ? <p className="rf-section__eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          <p className="rf-section__description">{description}</p>
        </div>
        {actions ? <div className="rf-section__actions">{actions}</div> : null}
      </div>
      <div className="rf-section__body">{children}</div>
    </section>
  );
}
