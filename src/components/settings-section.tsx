import type { ReactNode } from 'react';

/**
 * One labelled block inside a settings sub-page. `htmlFor` ties the heading to the single control
 * the block is about (it then renders as a `<label>`); blocks holding several controls leave it out.
 */
export function SettingsSection({
  title,
  htmlFor,
  children,
}: {
  title: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {title}
        </label>
      ) : (
        <h2 className="text-sm font-medium">{title}</h2>
      )}
      {children}
    </section>
  );
}

/** Shared look for the settings pages' native `<select>`s. */
export const SETTINGS_SELECT_CLASS = 'w-fit rounded-md border bg-background px-3 py-1.5 text-sm';
