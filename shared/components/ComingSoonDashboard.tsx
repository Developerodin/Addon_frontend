"use client";

import React from "react";
import Seo from "@/shared/layout-components/seo/seo";

interface ComingSoonDashboardProps {
  title: string;
  description: string;
  iconClass: string;
}

/**
 * Coming-soon placeholder for module dashboards under /dashboards/*.
 */
export default function ComingSoonDashboard({
  title,
  description,
  iconClass,
}: ComingSoonDashboardProps) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-heading`;

  return (
    <>
      <Seo title={title} />
      <section
        className="box"
        aria-labelledby={headingId}
        aria-label={`${title} coming soon`}
      >
        <div className="box-body">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <i className={`${iconClass} text-3xl`} />
            </div>
            <span className="mb-3 inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-wide text-warning">
              Coming soon
            </span>
            <h1 id={headingId} className="mb-2 text-2xl font-semibold text-defaulttextcolor">
              {title}
            </h1>
            <p className="max-w-md text-sm text-[#8c9097] dark:text-white/50">{description}</p>
          </div>
        </div>
      </section>
    </>
  );
}
