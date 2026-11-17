import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const frontend = fileURLToPath(new URL("../", import.meta.url));
const root = path.resolve(frontend, "..");
const out = path.join(root, "evidencias/punto-11");
const report = JSON.parse(fs.readFileSync(path.join(out, "resultados-vitest.json"), "utf8"));
const checks = JSON.parse(fs.readFileSync(path.join(out, "verificaciones.json"), "utf8"));
const assertions = report.testResults.flatMap((suite) => suite.assertionResults.map((item) => ({ ...item, file: suite.name })));
const definitions = [
  ["01", "LoginPage", "CA-AUTH-01", "Login válido", "Navegar a / y refrescar; POST con credenciales"],
  ["02", "LoginPage", "CA-AUTH-02", "Login rechazado", "Alerta de credenciales incorrectas; sin navegación"],
  ["03", "LoginPage", "CA-FORM-01", "Enviar formulario vacío", "Campos inválidos; ninguna solicitud ni navegación"],
  ["04", "LoginPage", "CA-AUTH-03", "Login pendiente", "Botón Validando y correo deshabilitados; recupera botón al terminar"],
  ["05", "UsersPage", "CA-USR-01", "Consulta pendiente y resuelta", "Cargando usuarios, luego fila Ana Prueba sin indicador de carga"],
  ["06", "UsersPage", "CA-USR-02", "Respuesta vacía", "Mensaje sin usuarios y botón Siguiente deshabilitado"],
  ["07", "UsersPage", "CA-USR-03", "Buscar Luis y borrar búsqueda", "Ocultar Ana al buscar; recuperar Ana al borrar"],
  ["08", "UsersPage", "CA-USR-04", "API devuelve HTTP 500", "Alerta comprensible y ausencia de datos ficticiamente recuperados"],
  ["09", "UsersPage", "CA-USR-05", "Completar y enviar registro", "Mensaje de éxito, fila nueva y cierre del diálogo; payload correcto"],
  ["10", "MembershipsPage", "CA-MEM-01", "Seleccionar filtro Canceladas", "Listado vacío, filtro seleccionado y consulta CANCELLED"],
  ["11", "MembershipsPage", "CA-MEM-02", "Registrar membresía", "Éxito, diálogo cerrado y POST con usuario, plan, fecha UTC y estado"],
  ["12", "MembershipsPage", "CA-MEM-03", "Abrir edición y cancelar", "Diálogo cerrado, fila conservada y ningún PATCH"],
  ["13", "PaymentsPage", "CA-PAY-01", "Historial con datos", "Fila de Ana Prueba con método Efectivo"],
  ["14", "PaymentsPage", "CA-PAY-02", "Abrir pago sin usuario y cancelar", "Membresía y envío deshabilitados; diálogo cerrado y ningún POST"],
  ["15", "PaymentsPage", "CA-PAY-03", "Seleccionar usuario/membresía y registrar pago", "Éxito, diálogo cerrado y POST vinculado a la membresía elegida"],
  ["16", "AdminShell", "CA-SESSION-01", "Esperar verificación de sesión", "Contenido privado oculto durante carga y visible tras sesión aceptada"],
  ["17", "AdminShell + authFetch", "CA-SESSION-02", "Sesión devuelve HTTP 401", "Redirección a /login, alerta y contenido privado oculto"],
  ["18", "AdminShell", "CA-SESSION-03", "Pulsar Cerrar sesión", "POST logout con credenciales y navegación a /login"],
];
const esc = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const matrix = definitions.map(([number, component, criterion, scenario, expected]) => {
  const id = `P11-${number}`;
  const found = assertions.filter((item) => item.fullName.includes(id + " |"));
  if (found.length !== 1) throw new Error(`Falta resultado único para ${id}`);
  const result = found[0];
  const passed = result.status === "passed";
  return { id, component, criterion, scenario, expected,
    obtained: passed ? `Confirmado por assertions: ${expected} (${result.duration ?? 0} ms)` : result.failureMessages.join(" "),
    result: passed ? "PASS" : "FAIL", file: path.relative(root, result.file).replaceAll("\\", "/") };
});
if (assertions.length !== definitions.length) throw new Error("El catálogo de evidencias no coincide con el total ejecutado");
fs.writeFileSync(path.join(out, "matriz-pruebas.md"), [
  "# Matriz de pruebas del punto 11", "",
  "No se suministró guía ni catálogo SWR en el repositorio. Los CA siguientes son criterios de aceptación derivados de comportamientos existentes, no identificadores SWR oficiales. Cada nombre de prueba contiene su CA y su ID.", "",
  "Los resultados provienen de resultados-vitest.json; PASS significa que se ejecutaron y aprobaron todas las assertions del caso, no una certificación de navegador o backend real.", "",
  "| ID | Componente | Criterio | Escenario | Esperado | Obtenido | Estado | Código |",
  "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ...matrix.map((row) => `| ${[row.id, row.component, row.criterion, row.scenario, row.expected, row.obtained, row.result].map(esc).join(" | ")} | [Prueba](../../${row.file}) |`), "",
].join("\n"));
fs.writeFileSync(path.join(out, "matriz-pruebas.json"), JSON.stringify(matrix, null, 2) + "\n");

function explain(line) {
  const text = line.trim();
  if (text.startsWith("import") && text.includes("@testing-library/react")) return "Importa render y los selectores del DOM; act/waitFor/within, cuando aparecen, permiten esperar React y limitar consultas al diálogo real.";
  if (text.startsWith("import") && text.includes("user-event")) return "Importa userEvent para simular escritura, selección y clics como acciones del usuario.";
  if (text.startsWith("import") && text.includes("vitest")) return "Importa test para declarar el caso y expect para comprobar sus resultados.";
  if (text.startsWith("import") && text.includes("support/http")) return "Importa respuestas HTTP simuladas y fixtures sintéticos. Ningún dato procede de Supabase.";
  if (text.startsWith("import") && text.includes("navigation")) return "Importa el router simulado estable; permite comprobar el destino solicitado sin montar Next.js.";
  if (text.startsWith("import")) return "Importa el componente real bajo prueba; no se sustituye su formulario ni su lógica.";
  if (text.startsWith("test(")) return "Declara un caso asíncrono identificado por P11 y su criterio de aceptación.";
  if (text.includes("const http = mockHttp")) return "Instala el mock de fetch y conserva el espía para comprobar el contrato HTTP. Las mutaciones solo devuelven respuestas en memoria.";
  if (text.includes("pathname.endsWith") && text.includes("/users")) return "Responde a la consulta simulada de usuarios con una página que contiene el fixture Ana Prueba.";
  if (text.includes("pathname.endsWith") && text.includes("/memberships")) return "Responde a la consulta simulada de membresías con la membresía asociada al usuario del fixture.";
  if (text.includes("return init.method")) return "Distingue el POST simulado del listado GET: devuelve éxito de registro o una página vacía, sin persistir datos.";
  if (text.includes("userEvent.setup")) return "Crea una sesión de interacción de usuario para este caso.";
  if (text.startsWith("render(")) return "Monta el componente real en jsdom con React Testing Library; en pantallas privadas también se ejecuta AdminShell.";
  if (text.includes("const dialog = within")) return "Localiza el diálogo por su rol y nombre accesible; limita los selectores posteriores a ese formulario.";
  if (text.includes("await dialog.findByRole")) return "Espera a que se cargue la opción de usuario o membresía desde el mock antes de seleccionarla.";
  if (text.includes("await screen.findByText") && !text.includes("expect(")) return "Espera a que termine el listado inicial y aparezca el estado vacío antes de interactuar.";
  if (text.includes("expect(await screen.findByText")) return "Espera y comprueba que el nombre del usuario sea visible. Se consulta el texto porque la celda también incluye las iniciales del avatar en su nombre accesible.";
  if (text.includes("user.type")) return "Localiza el campo por su etiqueta accesible y escribe el valor indicado; await espera los eventos del usuario.";
  if (text.includes("user.selectOptions")) return "Selecciona la opción del formulario mediante su etiqueta, disparando el cambio real de React.";
  if (text.includes("user.click")) return "Pulsa el botón por rol y nombre accesible; la acción abre o envía el formulario real según el botón indicado.";
  if (text.includes("expect(http).toHaveBeenCalledWith")) return "Comprueba URL y opciones de la solicitud simulada: método y los campos del payload o credenciales indicados en la assertion.";
  if (text.includes("router.replace")) return "Espera y verifica que el login exitoso solicite navegación al dashboard (/).";
  if (text.includes("router.refresh")) return "Verifica que se solicite un único refresco de navegación después del login.";
  if (text.includes("findByRole(\"status\"")) return "Espera el mensaje visible de éxito y comprueba su texto exacto esperado dentro del elemento status.";
  if (text.includes("findByRole(\"cell\"")) return "Espera y comprueba que el nombre del nuevo usuario sea visible en una celda de la tabla.";
  if (text.includes("queryByRole(\"dialog\"")) return "Comprueba que el diálogo ya no existe después de un registro exitoso, esperando la actualización si usa waitFor.";
  if (text === "});") return "Cierra el caso de prueba o el callback de configuración del mock abierto en el bloque correspondiente.";
  if (!text) return "Separación visual; no ejecuta una instrucción.";
  return "Continúa o cierra la expresión del bloque mostrado; su efecto pertenece a la llamada inmediatamente anterior.";
}
const examples = [];
for (const id of ["P11-01", "P11-09", "P11-15"]) {
  const row = matrix.find((item) => item.id === id);
  const lines = fs.readFileSync(path.join(root, row.file), "utf8").split(/\r?\n/);
  const first = lines.findIndex((line) => line.startsWith(`test("${id} |`));
  const next = lines.findIndex((line, index) => index > first && line.startsWith("test("));
  const last = next === -1 ? lines.length : next;
  const selected = lines.map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line, number }) => line.startsWith("import ") || (number > first && number <= last));
  examples.push(`## ${id}: ${row.scenario}`, "", `Archivo: [${row.file}](../../${row.file}). Criterio: ${row.criterion}.`, "",
    "```tsx", ...selected.map(({ line, number }) => `${String(number).padStart(3)} ${line}`), "```", "",
    "| Línea | Explicación |", "| --- | --- |",
    ...selected.map(({ line, number }) => `| ${number} | ${esc(explain(line))} |`), "");
}
fs.writeFileSync(path.join(out, "explicacion-tres-pruebas.md"), [
  "# Explicación línea por línea", "",
  "El código y la numeración se extraen de los archivos ejecutados. Los imports se incluyen aunque algún auxiliar se utilice en otros casos del mismo archivo.", "",
  "Contexto común: tests/setup.ts instala jest-dom, limpia el DOM después de cada caso y simula next/navigation con tests/support/navigation.ts. tests/support/http.ts sustituye fetch, responde a /auth/session para montar AdminShell y valida el origen reservado fitzone.test.invalid. Las rutas no previstas se registran y hacen fallar el afterEach. Los helpers de HTTP construyen datos y respuestas de prueba; no se añadieron funciones al producto para aumentar el número de casos. La prueba de sesión 401 sustituye únicamente location.replace, porque jsdom no implementa navegación real.", "", ...examples,
].join("\n"));

const now = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "long" }).format(new Date());
fs.writeFileSync(path.join(out, "reporte-ejecucion.md"), [
  "# Reporte de ejecución — punto 11", "", `Generado: ${now}.`, "",
  `Resultado Vitest: ${report.numTotalTests} ejecutadas; ${report.numPassedTests} aprobadas; ${report.numFailedTests} fallidas; ${report.numPendingTests} pendientes. Éxito global: ${report.success}.`, "",
  `Inicio registrado por Vitest (UTC): ${new Date(report.startTime).toISOString()}.`, "",
  "Entorno: Windows, Node " + process.version + ", Vitest + React Testing Library y jsdom; cinco archivos de casos. Consultar dependencias.log para versiones resueltas.", "",
  "| Comando | Código de salida | Resultado |", "| --- | --- | --- |",
  ...checks.map((item) => `| ${esc(item.command)} | ${item.exitCode} | ${item.exitCode === 0 ? "PASS" : "FAIL"} |`), "",
  "## Incidencias conservadas", "",
  "- La descarga inicial de npm fue bloqueada por EACCES en el entorno restringido; se repitió con acceso autorizado.",
  "- Vitest 5 presentó ERESOLVE con @types/node 20. Se instaló Vitest 4 con versiones compatibles, sin --force ni --legacy-peer-deps.",
  "- La primera ejecución no llegó a ejecutar pruebas: cinco suites fallaron al exportar una variable hoisted del mock. Se separó el router en support/navigation.ts. Ver ejecucion-inicial.json y ejecucion-inicial.log.",
  "- El lint inicial detectó una instalación transitiva incompleta (es-to-primitive/es5). Se reinstaló con npm ci desde el lockfile. Ver lint-inicial.log.",
  "- El primer npm ci encontró EPERM porque Next.js mantenía cargado su binario SWC. Se detuvo únicamente el frontend identificado y se repitió la instalación; el backend no se detuvo.",
  "- npm ci por sí solo no resolvió el problema: se verificó que el lockfile omitía las dependencias de es-abstract en su entrada raíz. npm dedupe también dejó dependencias sin resolver. Se conservaron package-lock-antes-reparacion.json y node-modules-lock-antes-reparacion.json, se regeneró el lockfile desde las declaraciones del proyecto y se reinstaló. Las versiones declaradas de Next.js y React se mantuvieron.",
  "- Los reportes intermedios, si existen, se conservan como ejecucion-intermedia.*. Sus fallos se corrigieron en el entorno o las pruebas, sin eliminar assertions para obtener PASS.",
  "- La ejecución intermedia tuvo 15 PASS y 3 FAIL en Usuarios: los selectores exigían un nombre de celda exacto, pero el avatar añade sus iniciales al nombre accesible. Se corrigieron a selectores del texto visible conservando las verificaciones de presencia, ausencia y filtrado.",
  "- npm informó vulnerabilidades moderadas durante la instalación; no se ejecutó npm audit fix ni se amplió el alcance a una actualización general de dependencias.", "",
  "## Alcance y límites", "",
  "Se ejecutaron comportamientos visibles de los componentes reales: formularios, mensajes, estados, búsqueda, filtros, cancelación, registro y sesión. POST y PATCH son llamadas simuladas en memoria. No se ejecutaron peticiones al backend ni a Supabase. No se modificó la autenticación ni el diseño del producto.", "",
  "jsdom no certifica diseño visual, cookies HttpOnly, seguridad del servidor, persistencia ni navegación real. Las verificaciones HTTP y manuales de turnos anteriores no se cuentan como pruebas Vitest de este reporte. No se implementaron otros puntos académicos.", "",
  "## Artefactos", "",
  "- matriz-pruebas.md y matriz-pruebas.json: trazabilidad por CA, escenario y resultado real.",
  "- resultados-vitest.json y resultados-vitest.xml: reportes originales JSON y JUnit.",
  "- ejecucion-final.log: salida legible de la suite; build.log, lint.log y typescript.log: verificaciones finales.",
  "- explicacion-tres-pruebas.md: imports y líneas de tres casos representativos.",
  "- README.md: reproducción y organización de archivos.",
  "- integridad.json: hashes de las fuentes y configuración de pruebas usadas para generar estas evidencias.", "",
].join("\n"));
const files = ["frontend/package.json", "frontend/package-lock.json", "frontend/vitest.config.mts", "frontend/scripts/punto11-evidence.mjs", ...matrix.map((row) => row.file),
  "frontend/tests/setup.ts", "frontend/tests/support/http.ts", "frontend/tests/support/navigation.ts", "frontend/tests/support/network-guard.ts",
  "frontend/src/app/login/page.tsx", ...["users-page", "memberships-page", "payments-page", "admin-shell"].map((name) => `frontend/src/components/${name}.tsx`), "frontend/src/lib/auth-fetch.ts"];
fs.writeFileSync(path.join(out, "integridad.json"), JSON.stringify([...new Set(files)].map((file) => ({ file, sha256: createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex") })), null, 2) + "\n");
console.log(`Evidencias generadas desde ${assertions.length} resultados reales de Vitest.`);
