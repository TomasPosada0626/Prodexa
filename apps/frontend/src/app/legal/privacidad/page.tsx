import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Politica de tratamiento de datos personales | Prodexa',
  description:
    'Como Prodexa recolecta, usa y protege tus datos personales, y como ejercer tus derechos como titular bajo la Ley 1581 de 2012.',
};

// Redactado con apoyo de IA (Claude Code, 2026-08-14), alineado de buena fe a la Ley 1581 de
// 2012 y su normativa reglamentaria (Decreto 1377 de 2013 / Decreto 1074 de 2015), y revisado
// por asesoria legal externa el 14 de agosto de 2026, que aprobo este texto sin cambios. Un
// cambio material despues de esta fecha (nuevo tipo de dato recolectado, nuevo encargado del
// tratamiento, etc.) necesita su propia revision — la aprobacion de arriba cubre esta version.

export default function PoliticaDePrivacidadPage() {
  return (
    <LegalLayout titulo="Politica de tratamiento de datos personales" actualizado="14 de agosto de 2026">
      <div className="not-prose mb-8 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
        <p className="font-semibold text-white">Aviso de privacidad (resumen)</p>
        <p className="mt-2">
          Prodexa recolecta tu nombre, correo, contrasena (nunca en texto plano) y datos de la
          empresa que registras o a la que te unes, para poder prestarte el servicio de costeo,
          produccion y calidad descrito en esta plataforma. Tambien registramos IP y navegador en
          eventos de seguridad (inicio de sesion, cambios de rol) por motivos de auditoria. No
          vendemos tus datos a terceros. Puedes conocer, actualizar, rectificar o solicitar la
          eliminacion de tus datos en cualquier momento escribiendo a{' '}
          <a href="mailto:tomasposada67@gmail.com">tomasposada67@gmail.com</a>. El detalle completo
          esta mas abajo.
        </p>
      </div>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de los datos personales recolectados a traves de Prodexa es{' '}
        <strong>Tomas Posada</strong>, operando actualmente como proyecto individual (no como
        persona juridica constituida), con contacto en{' '}
        <a href="mailto:tomasposada67@gmail.com">tomasposada67@gmail.com</a>. Si Prodexa se
        constituye como persona juridica en el futuro, esta politica se actualizara para reflejar
        el nuevo responsable.
      </p>

      <h2>2. Marco normativo</h2>
      <p>
        Esta politica se rige por la Ley 1581 de 2012 (proteccion de datos personales / Habeas
        Data), el Decreto 1377 de 2013 y el Decreto 1074 de 2015 (Republica de Colombia), y
        aplica a cualquier persona (titular) cuyos datos personales sean tratados por Prodexa,
        sin importar el pais desde el que acceda al servicio.
      </p>

      <h2>3. Definiciones utiles</h2>
      <ul>
        <li>
          <strong>Dato personal:</strong> cualquier informacion vinculada o que pueda asociarse a
          una o varias personas naturales determinadas o determinables.
        </li>
        <li>
          <strong>Titular:</strong> la persona natural cuyos datos personales son objeto de
          tratamiento (tu, como usuario de Prodexa).
        </li>
        <li>
          <strong>Tratamiento:</strong> cualquier operacion sobre datos personales, como
          recoleccion, almacenamiento, uso, circulacion o supresion.
        </li>
        <li>
          <strong>Autorizacion:</strong> consentimiento previo, expreso e informado del titular
          para tratar sus datos personales.
        </li>
      </ul>

      <h2>4. Datos que recolectamos</h2>
      <p>Prodexa recolecta unicamente los datos necesarios para prestar el servicio:</p>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, correo electronico, contrasena (almacenada
          siempre como hash con Argon2, nunca en texto plano), y el rol que tienes dentro de tu
          organizacion (ADMIN, COORDINADOR o MIEMBRO).
        </li>
        <li>
          <strong>Datos de la organizacion:</strong> el nombre de la empresa que registras o a la
          que te unes, y las tarifas/parametros de costeo que esa empresa configura. Estos datos
          pertenecen a la organizacion, no a un usuario individual.
        </li>
        <li>
          <strong>Datos de seguridad y auditoria:</strong> direccion IP, tipo de navegador
          (user agent) y marca de tiempo, registrados automaticamente en eventos como inicio de
          sesion, cierre de sesion, cambios de rol o cambios de contrasena, para poder detectar
          actividad sospechosa y para que tu organizacion tenga un historial confiable de quien
          cambio que.
        </li>
        <li>
          <strong>Datos de negocio que tu cargas:</strong> formulaciones, ingredientes, precios,
          ordenes de produccion, proveedores y estado de registro sanitario. Estos son datos de tu
          negocio, no datos personales de terceros, salvo que tu mismo incluyas informacion
          personal de alguien en un campo de texto libre (lo cual no es necesario para usar la
          plataforma).
        </li>
      </ul>
      <p>
        Prodexa no solicita ni recolecta intencionalmente datos sensibles (salud, origen etnico,
        orientacion politica o religiosa, biometricos, etc.).
      </p>

      <h2>5. Finalidades del tratamiento</h2>
      <ul>
        <li>Crear y administrar tu cuenta y la de tu organizacion.</li>
        <li>Prestar las funcionalidades de la plataforma (costeo, produccion, calidad, reportes).</li>
        <li>
          Verificar tu identidad al iniciar sesion y proteger tu cuenta (deteccion de intentos de
          acceso indebido, auditoria de seguridad).
        </li>
        <li>Enviar comunicaciones operativas necesarias (por ejemplo, el codigo para recuperar tu contrasena).</li>
        <li>Cumplir obligaciones legales aplicables.</li>
        <li>
          Mejorar el servicio (por ejemplo, entender que funcionalidades se usan mas), siempre con
          datos agregados o seudonimizados cuando sea posible.
        </li>
      </ul>
      <p>Prodexa no usa tus datos personales para publicidad de terceros ni los vende.</p>

      <h2>6. A quien se transfieren o transmiten tus datos</h2>
      <p>
        Prodexa usa proveedores de infraestructura para operar el servicio, que actuan como
        encargados del tratamiento bajo sus propios estandares de seguridad y sus terminos
        contractuales:
      </p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (hosting del frontend) y <strong>Render Services, Inc.</strong>{' '}
          (hosting del backend y la base de datos), ambos con infraestructura que puede ubicarse
          fuera de Colombia. Al usar Prodexa, aceptas esta transferencia internacional necesaria
          para operar el servicio.
        </li>
        <li>
          <strong>Resend</strong>, para el envio del correo con el codigo de recuperacion de
          contrasena (solo cuando esa funcionalidad esta configurada con credenciales reales).
        </li>
        <li>
          Opcionalmente, <strong>Cloudflare R2</strong> para almacenamiento de imagenes, si tu
          despliegue especifico lo tiene configurado.
        </li>
        <li>
          Opcionalmente, <strong>Sentry</strong>, para el reporte de errores tecnicos no
          controlados (frontend y backend), unicamente cuando esta configurado con credenciales
          reales. Sin esa configuracion, no se envia ningun dato a Sentry.
        </li>
      </ul>
      <p>
        No compartimos tus datos personales con terceros para fines comerciales o de mercadeo.
      </p>

      <h2>7. Tus derechos como titular</h2>
      <p>Como titular de tus datos personales, tienes derecho a:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos personales.</li>
        <li>
          Solicitar prueba de la autorizacion otorgada para el tratamiento de tus datos, salvo
          cuando la ley no lo exija.
        </li>
        <li>
          Ser informado, previa solicitud, sobre el uso que se le ha dado a tus datos personales.
        </li>
        <li>
          Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones
          a la Ley 1581 de 2012.
        </li>
        <li>
          Revocar la autorizacion y/o solicitar la supresion de tus datos, cuando no exista un
          deber legal o contractual que impida eliminarlos (por ejemplo, obligaciones de
          conservacion de historiales financieros de tu organizacion).
        </li>
        <li>Acceder de forma gratuita a tus datos personales que hayan sido objeto de tratamiento.</li>
      </ul>

      <h2>8. Como ejercer tus derechos</h2>
      <p>
        Conocer, actualizar y rectificar tus datos: hazlo directamente desde{' '}
        <strong>Configuracion → Perfil</strong> dentro de la plataforma.
      </p>
      <p>
        Eliminar tu cuenta: desde <strong>Configuracion → Zona de peligro</strong> puedes eliminar
        tu perfil vos mismo, sin tener que escribirnos, con tu contrasena como confirmacion. Si sos
        MIEMBRO o COORDINADOR (o ADMIN y hay otro administrador activo en tu equipo), se borran tu
        correo, nombre y contrasena de inmediato; tus formulaciones y ordenes de produccion se
        conservan porque pertenecen a la empresa, no a ti individualmente (asi se preserva el
        historial financiero real de la organizacion), y el autor queda mostrado como
        &quot;Usuario eliminado&quot;. Si sos el unico ADMIN de tu equipo, primero debes transferir
        ese rol a otro miembro desde &quot;Mi equipo&quot;, o usar &quot;Eliminar la empresa
        completa&quot; si preferis borrar todo. Un ADMIN de tu organizacion tambien puede remover
        tu acceso en cualquier momento (Configuracion → Mi equipo) con el mismo efecto sobre tus
        datos.
      </p>
      <p>
        Para cualquier otra solicitud (prueba de autorizacion, informacion sobre el uso de tus
        datos, quejas, o si preferis gestionarlo por correo en vez de usar la plataforma), escribe
        a <a href="mailto:tomasposada67@gmail.com">tomasposada67@gmail.com</a> con el asunto
        &quot;Datos personales&quot;, indicando tu nombre, correo registrado y la solicitud
        especifica. Responderemos las consultas en un plazo maximo de 10 dias habiles y los
        reclamos en un plazo maximo de 15 dias habiles, contados desde la fecha de recibo,
        conforme al Decreto 1377 de 2013. Si no es posible resolver el reclamo dentro de ese
        plazo, se informara al titular el motivo de la demora y la fecha en que se atendera, que
        no podra superar los 8 dias habiles siguientes al vencimiento del primer plazo.
      </p>

      <h2>9. Medidas de seguridad</h2>
      <p>
        Prodexa protege tus datos con contrasenas hasheadas con Argon2, cookies de sesion
        httpOnly (no accesibles desde JavaScript), control de acceso basado en roles por
        organizacion, limite de intentos de inicio de sesion, y registro de auditoria de eventos
        de seguridad. El detalle tecnico completo esta documentado publicamente en el repositorio
        del proyecto.
      </p>

      <h2>10. Conservacion de los datos</h2>
      <p>
        Conservamos tus datos personales mientras tu cuenta este activa y sea razonablemente
        necesario para las finalidades descritas arriba. Si solicitas la eliminacion de tu cuenta,
        eliminaremos o anonimizaremos tus datos personales, salvo la informacion que debamos
        conservar por obligacion legal, contractual o para la defensa de derechos (por ejemplo,
        logs de auditoria de seguridad ya generados, o datos de negocio que pertenecen a tu
        organizacion).
      </p>

      <h2>11. Menores de edad</h2>
      <p>
        Prodexa no esta dirigido a menores de edad y no recolecta intencionalmente datos
        personales de menores de 18 anos.
      </p>

      <h2>12. Cambios a esta politica</h2>
      <p>
        Podemos actualizar esta politica cuando cambien nuestras practicas de tratamiento de
        datos. Publicaremos la version vigente en esta misma pagina con su fecha de actualizacion.
        Los cambios materiales se comunicaran por correo a los usuarios activos cuando sea
        razonable hacerlo.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Para cualquier duda sobre esta politica o sobre el tratamiento de tus datos, escribe a{' '}
        <a href="mailto:tomasposada67@gmail.com">tomasposada67@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
