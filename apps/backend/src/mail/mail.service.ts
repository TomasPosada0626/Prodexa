import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor() {
    // Mismo espiritu que StorageModule con las variables de R2: mejor fallar fuerte al
    // iniciar que caer en silencio al fallback de mas abajo (loguear en vez de enviar) en
    // produccion — ese fallback escribe el codigo real de recuperacion de contrasena en
    // texto plano en los logs, que en produccion cualquiera con acceso a logs podria leer
    // y usar para tomar una cuenta ajena.
    if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
      throw new Error(
        'RESEND_API_KEY es obligatoria en produccion: sin ella, los codigos de recuperacion de contrasena quedarian en texto plano en los logs en vez de enviarse por correo.',
      );
    }
    this.resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
  }

  async enviarCodigoRecuperacion(
    destinatario: string,
    codigo: string,
  ): Promise<void> {
    await this.enviar(
      destinatario,
      'Recupera tu contrasena en Prodexa',
      `Tu codigo de recuperacion es: ${codigo}\n\nVence en 15 minutos. Si no pediste esto, ignora este correo.`,
    );
  }

  /**
   * Nunca debe tumbar el flujo principal (recuperacion de contrasena) si falla: se
   * atrapa y se loguea, pero no se relanza — mismo espiritu que AuditService.log.
   * Sin RESEND_API_KEY configurada, loguea el contenido en vez de enviarlo (incluido
   * el codigo) para que el desarrollo local no necesite una cuenta de Resend.
   */
  private async enviar(
    destinatario: string,
    asunto: string,
    texto: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.log(
        `[MODO DESARROLLO] correo no enviado (falta RESEND_API_KEY) — para: ${destinatario}, asunto: "${asunto}", contenido: ${texto}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: process.env.MAIL_FROM ?? 'Prodexa <onboarding@resend.dev>',
        to: destinatario,
        subject: asunto,
        text: texto,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo a ${destinatario}`,
        error as Error,
      );
    }
  }
}
