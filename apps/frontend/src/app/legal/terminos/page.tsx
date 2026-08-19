import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terminos y condiciones | Prodexa',
  description: 'Condiciones de uso de la plataforma Prodexa.',
};

// Redactado con apoyo de IA (Claude Code, 2026-08-14) y revisado por asesoria legal externa
// el 14 de agosto de 2026, que aprobo este texto sin cambios. Si el texto cambia de forma
// material despues de esta fecha (por ejemplo, si Prodexa pasa a cobrar por el servicio),
// ese cambio necesita su propia revision — la aprobacion de arriba cubre esta version, no
// versiones futuras.

export default function TerminosYCondicionesPage() {
  return (
    <LegalLayout titulo="Terminos y condiciones" actualizado="14 de agosto de 2026">
      <h2>1. Aceptacion de estos terminos</h2>
      <p>
        Al crear una cuenta en Prodexa aceptas estos Terminos y Condiciones y la{' '}
        <a href="/legal/privacidad">Politica de tratamiento de datos personales</a>. Si no estas
        de acuerdo, no debes registrarte ni usar la plataforma.
      </p>

      <h2>2. Que es Prodexa</h2>
      <p>
        Prodexa es una plataforma de costeo, produccion y rentabilidad para fabricantes de
        alimentos y cosmeticos, que permite formular, costear, producir con control de calidad y
        analizar rentabilidad por producto. Prodexa se encuentra actualmente en{' '}
        <strong>fase de pilotaje con clientes reales</strong>: el producto puede tener cambios
        frecuentes, y algunas funcionalidades pueden ajustarse a partir de lo que aprendamos con
        el uso real.
      </p>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>Debes proporcionar informacion veraz al registrarte.</li>
        <li>
          Eres responsable de mantener la confidencialidad de tu contrasena y de toda la
          actividad que ocurra bajo tu cuenta.
        </li>
        <li>
          Si tu cuenta pertenece a una organizacion, un usuario con rol ADMIN o COORDINADOR puede
          gestionar el acceso de los demas miembros, incluyendo cambiar roles o remover miembros
          del equipo.
        </li>
        <li>Debes notificarnos de inmediato si sospechas un uso no autorizado de tu cuenta.</li>
      </ul>

      <h2>4. Uso aceptable</h2>
      <p>Al usar Prodexa te comprometes a no:</p>
      <ul>
        <li>Usar la plataforma para fines ilegales o fraudulentos.</li>
        <li>
          Intentar vulnerar, escanear o poner a prueba la seguridad de la plataforma sin
          autorizacion expresa (si encuentras una vulnerabilidad, repórtala segun el proceso
          descrito en el repositorio del proyecto en vez de explotarla).
        </li>
        <li>Compartir tus credenciales de acceso con personas ajenas a tu organizacion.</li>
        <li>
          Intentar acceder a datos de otra organizacion distinta a la tuya, o interferir con el
          servicio para otros usuarios.
        </li>
      </ul>

      <h2>5. Propiedad de los datos e informacion que cargas</h2>
      <p>
        Los datos de negocio que tu organizacion carga en Prodexa (formulaciones, precios,
        ordenes de produccion, proveedores) son propiedad de tu organizacion. Prodexa no reclama
        propiedad sobre ese contenido; lo tratamos unicamente para prestarte el servicio, segun se
        describe en la{' '}
        <a href="/legal/privacidad">Politica de tratamiento de datos personales</a>.
      </p>
      <p>
        El software, el codigo, el diseno y la marca &quot;Prodexa&quot; son propiedad de su
        desarrollador y estan protegidos por las leyes de propiedad intelectual aplicables. Estos
        terminos no te otorgan ningun derecho sobre el software mas alla del uso de la plataforma
        tal como se ofrece.
      </p>

      <h2>6. Naturaleza informativa del registro sanitario</h2>
      <p>
        El campo de &quot;registro sanitario&quot; de cada formulacion es informacion que tu
        organizacion ingresa y mantiene por su cuenta, con fines de seguimiento interno. Prodexa
        no verifica ni certifica esa informacion ante INVIMA ni ante ninguna autoridad
        regulatoria: la responsabilidad de mantener el registro sanitario real de tus productos
        vigente ante las autoridades competentes es exclusivamente tuya y de tu organizacion.
      </p>

      <h2>7. Disponibilidad del servicio</h2>
      <p>
        Durante esta fase de pilotaje, Prodexa se ofrece sin garantia de disponibilidad continua
        24/7. En particular, el entorno de backend puede &quot;dormirse&quot; tras periodos de
        inactividad y tardar en responder la primera peticion tras despertar. Haremos esfuerzos
        razonables para mantener el servicio disponible y para avisar de mantenimientos
        planificados, pero no garantizamos ausencia total de interrupciones.
      </p>

      <h2>8. Limitacion de responsabilidad</h2>
      <p>
        Prodexa se ofrece &quot;tal cual&quot; (&quot;as is&quot;) durante esta fase de pilotaje.
        En la maxima medida permitida por la ley aplicable, Prodexa y su desarrollador no seran
        responsables por decisiones de negocio, precios o margenes que tomes con base en los
        calculos de la plataforma, ni por perdidas indirectas derivadas del uso o la
        imposibilidad de uso del servicio. Esto no limita responsabilidades que no puedan
        limitarse por ley (por ejemplo, en caso de dolo o culpa grave).
      </p>

      <h2>9. Terminacion</h2>
      <p>
        Puedes dejar de usar Prodexa y solicitar la eliminacion de tu cuenta en cualquier momento,
        conforme a la{' '}
        <a href="/legal/privacidad">Politica de tratamiento de datos personales</a>. Podemos
        suspender o terminar cuentas que incumplan estos terminos, previo aviso cuando sea
        razonablemente posible.
      </p>

      <h2>10. Cambios a estos terminos</h2>
      <p>
        Podemos actualizar estos terminos a medida que el producto evolucione, especialmente
        durante esta fase de pilotaje. Publicaremos la version vigente en esta pagina con su fecha
        de actualizacion, y comunicaremos cambios materiales a los usuarios activos por correo
        cuando sea razonable hacerlo.
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Estos terminos se rigen por las leyes de la Republica de Colombia.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para preguntas sobre estos terminos, escribe a{' '}
        <a href="mailto:tomasposada67@gmail.com">tomasposada67@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
