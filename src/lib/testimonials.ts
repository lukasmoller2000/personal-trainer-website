export type Testimonial = {
  name: string;
  quote: string;
  image?: string;
  goal?: string;
  result?: string;
  period?: string;
  beforeImage?: string;
  afterImage?: string;
};

/** Real client stories only. Leave empty until Lukas supplies them. */
export const testimonials: Testimonial[] = [];

export function hasTestimonials(items: Testimonial[] = testimonials) {
  return items.some((item) => item.name.trim() && item.quote.trim());
}
