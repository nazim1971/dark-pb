import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SupportContactInfo {
  email: string;
  whatsapp: string;
  whatsappUrl: string;
  message: string;
}

@Injectable()
export class SupportService {
  constructor(private readonly configService: ConfigService) {}

  getContactInfo(): SupportContactInfo {
    const email = this.configService.getOrThrow<string>("SUPPORT_EMAIL");
    const whatsapp = this.configService.getOrThrow<string>("SUPPORT_WHATSAPP");
    const digits = whatsapp.replace(/\D/g, "");

    return {
      email,
      whatsapp,
      whatsappUrl: digits.length > 0 ? `https://wa.me/${digits}` : "",
      message: "Contact our support team by email or WhatsApp.",
    };
  }
}
