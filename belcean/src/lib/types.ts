export interface Service {
  slug: string;
  title: string;
  description: string;
  icon: React.ElementType;
  imageId: string;
  imageHint: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatarUrl: string;
}

export interface ClientType {
  name: string;
  icon: React.ElementType;
}

export interface WhyBeCleanReason {
  title: string;
  description: string;
  icon: React.ElementType;
}

export interface HowItWorksStep {
  title: string;
  description: string;
}

export interface PriceItem {
    name: string;
    price: string;
}
