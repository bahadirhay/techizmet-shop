import { THEME_SHELL_CMS_PAGE_STYLE } from "@/lib/mirror-cms-page";
import type { ThemeShellCmsPageContent } from "@/lib/theme-shell-cms-page-content";
import { ThemeShellSectionStyles } from "@/components/store/ThemeShellSectionStyles";

/** CMS sayfaları — mesafeli-satis, admin blok sayfaları */
export function ThemeShellCmsPageView({
  content,
  pageTitle,
}: {
  content: ThemeShellCmsPageContent;
  pageTitle?: string;
}) {
  const title = content.bannerTitle || pageTitle || "";

  return (
    <>
      <ThemeShellSectionStyles />
      <div dangerouslySetInnerHTML={{ __html: THEME_SHELL_CMS_PAGE_STYLE }} />
      <div className="kn-theme-shell-page kn-theme-shell-cms-page">
        {title ? (
          <section className="kn-theme-shell-page__banner page-banner">
            <div className="section-wrapper section-spacing scheme-primary section-gradient">
              <div className="page--content">
                <div className="container-narrow">
                  <div className="page--content-inner text-center">
                    <h1 className="page--title heading-font page--item h2">{title}</h1>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="kn-cms-page kn-mirror-section">
          <div className="section-wrapper section-spacing scheme-primary section-solid">
            <div className="container-narrow kn-cms-page-inner">
              <div dangerouslySetInnerHTML={{ __html: content.bodyHtml }} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
