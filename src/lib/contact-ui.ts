export function contactFormShowsSuccess(responseOk: boolean) {
  return responseOk === true;
}

export function phoneTelHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export function whatsappHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
