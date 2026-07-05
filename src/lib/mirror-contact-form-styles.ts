/** İletişim formu — ortalanmış tek sütun (theme shell + EN şablon) */
export const CONTACT_FORM_CENTERED_CSS = `
.section-contact-form .contact-form--wrapper,
.section-contact-form .contact-form--wrapper.style-both,
.section-contact-form .contact-form--wrapper.style-contact-form {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  grid-template-columns: none !important;
}
.section-contact-form .contact-form--map-box {
  display: none !important;
}
.section-contact-form .contact-form--content {
  max-width: 720px !important;
  margin: 0 auto !important;
  width: 100% !important;
  float: none !important;
  flex: none !important;
}
.section-contact-form .contact-form--content-inner {
  padding: 0 !important;
  text-align: center;
}
.section-contact-form .contact-form--content-inner h2,
.section-contact-form .contact-form--content-inner .contact-form--title,
.section-contact-form .contact-form--content-inner .section--heading {
  text-align: center !important;
}
.section-contact-form .contact-form--box {
  margin: 0 auto !important;
}
.section-contact-form .contact-form--fields {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 16px !important;
}
.section-contact-form .contact-form--fields .field {
  margin: 0 !important;
}
.section-contact-form [id*="contact_form"] .normal-button,
.section-contact-form [id*="contact_form"] .button {
  margin: 0 auto !important;
  display: block !important;
  width: fit-content !important;
}
@media only screen and (max-width: 767px) {
  .section-contact-form .contact-form--fields {
    grid-template-columns: 1fr !important;
  }
}
`.trim();
