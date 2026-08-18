const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

import { MailService } from './mail.service';

describe('MailService', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('en produccion sin RESEND_API_KEY, falla al construirse en vez de arrancar en modo inseguro', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;

    expect(() => new MailService()).toThrow(/RESEND_API_KEY/);
  });

  it('en produccion CON RESEND_API_KEY, se construye normalmente', () => {
    process.env.NODE_ENV = 'production';
    process.env.RESEND_API_KEY = 'clave-de-prueba';

    expect(() => new MailService()).not.toThrow();
  });

  it('sin RESEND_API_KEY, loguea el codigo en vez de enviarlo y no llama al SDK', async () => {
    delete process.env.RESEND_API_KEY;
    const service = new MailService();
    const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

    await service.enviarCodigoRecuperacion('user@test.com', '123456');

    expect(sendMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('123456'));
  });

  it('con RESEND_API_KEY configurada, envia el correo con el codigo', async () => {
    process.env.RESEND_API_KEY = 'clave-de-prueba';
    process.env.MAIL_FROM = 'Prodexa <noreply@prodexa.test>';
    sendMock.mockResolvedValue({ data: { id: 'abc' }, error: null });
    const service = new MailService();

    await service.enviarCodigoRecuperacion('user@test.com', '654321');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Prodexa <noreply@prodexa.test>',
        to: 'user@test.com',
        text: expect.stringContaining('654321') as string,
      }),
    );
  });

  it('si el envio falla, atrapa el error y no lo relanza', async () => {
    process.env.RESEND_API_KEY = 'clave-de-prueba';
    sendMock.mockRejectedValue(new Error('Resend caido'));
    const service = new MailService();
    const errorSpy = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation();

    await expect(
      service.enviarCodigoRecuperacion('user@test.com', '111111'),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  describe('enviarAlertaLoginsFallidos', () => {
    it('con RESEND_API_KEY configurada, envia la alerta al ADMIN con la cuenta afectada y el numero de intentos', async () => {
      process.env.RESEND_API_KEY = 'clave-de-prueba';
      sendMock.mockResolvedValue({ data: { id: 'abc' }, error: null });
      const service = new MailService();

      await service.enviarAlertaLoginsFallidos(
        'admin@empresa.test',
        'victima@empresa.test',
        5,
      );

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@empresa.test',
          subject: expect.stringContaining('5') as string,
          text: expect.stringContaining('victima@empresa.test') as string,
        }),
      );
    });

    it('sin RESEND_API_KEY, loguea en vez de enviar', async () => {
      delete process.env.RESEND_API_KEY;
      const service = new MailService();
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.enviarAlertaLoginsFallidos(
        'admin@empresa.test',
        'victima@empresa.test',
        5,
      );

      expect(sendMock).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('victima@empresa.test'),
      );
    });
  });
});
