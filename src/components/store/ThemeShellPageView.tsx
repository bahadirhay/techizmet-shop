import { ThemeShellSectionStyles } from "@/components/store/ThemeShellSectionStyles";
import type { ThemeShellPageContent } from "@/lib/theme-shell-page-content";

export function ThemeShellPageView({
  content,
  pageTitle,
}: {
  content: ThemeShellPageContent;
  pageTitle?: string;
}) {
  const title = content.bannerTitle || pageTitle || "";

  return (
    <>
      <ThemeShellSectionStyles />
      <div className="kn-theme-shell-page">
        {title ? (
          <section className="kn-theme-shell-page__banner page-banner">
            <div className="section-wrapper section-spacing scheme-primary section-gradient">
              <div className="page--content">
                <div className="container-narrow">
                  <div className="page--content-inner text-center">
                    <h1 className="page--title heading-font page--item h2">{title}</h1>
                    {content.bannerDescription ? (
                      <p className="page--desc page--item text-medium">{content.bannerDescription}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {content.bodyHtml ? (
          <section className="kn-theme-shell-page__richtext section-richtext">
            <div className="section-wrapper section-spacing scheme-primary section-solid">
              <div className="container-narrow">
                <div
                  className="richtext--content content-medium position-left text-left"
                  dangerouslySetInnerHTML={{ __html: content.bodyHtml }}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
