"""Generar desde la raíz del proyecto: python docs/generar-informe.py (reportlab)."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics import renderPDF, renderSVG
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'output/pdf'; OUT.mkdir(parents=True,exist_ok=True)
NAVY=colors.HexColor('#123047'); TEAL=colors.HexColor('#087f8c'); GRAY=colors.HexColor('#526272'); PALE=colors.HexColor('#edf4f7'); AMBER=colors.HexColor('#fff1d7')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCustom',fontName='Helvetica-Bold',fontSize=29,leading=33,textColor=NAVY,spaceAfter=16))
styles.add(ParagraphStyle(name='SubtitleCustom',fontSize=12,leading=18,textColor=GRAY,spaceAfter=15))
styles.add(ParagraphStyle(name='SectionCustom',fontName='Helvetica-Bold',fontSize=15,leading=20,textColor=NAVY,spaceBefore=13,spaceAfter=9))
styles.add(ParagraphStyle(name='BodyCustom',fontSize=10,leading=15,textColor=NAVY,spaceAfter=9))
styles.add(ParagraphStyle(name='CellCustom',fontSize=9,leading=12,textColor=NAVY))
styles.add(ParagraphStyle(name='SmallCustom',fontSize=8,leading=11,textColor=GRAY,spaceAfter=6))
def para(s,style='BodyCustom'):return Paragraph(s,styles[style])
def table(rows,widths):
 data=[[para(escape(str(c)),'CellCustom') for c in row] for row in rows]
 t=Table(data,colWidths=widths,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PALE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('LINEBELOW',(0,0),(-1,0),1,TEAL),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#dce5eb'))]))
 return t
def diagram():
 d=Drawing(487,245)
 def box(x,y,w,h,title,lines):
  d.add(Rect(x,y,w,h,rx=7,ry=7,fillColor=PALE,strokeColor=TEAL,strokeWidth=.8))
  d.add(String(x+w/2,y+h-18,title,fontName='Helvetica-Bold',fontSize=9,textAnchor='middle',fillColor=NAVY))
  for i,line in enumerate(lines):d.add(String(x+w/2,y+h-34-i*12,line,fontName='Helvetica',fontSize=8,textAnchor='middle',fillColor=GRAY))
 def arrow(x1,y1,x2,y2):
  import math
  d.add(Line(x1,y1,x2,y2,strokeColor=TEAL,strokeWidth=1.2))
  a=math.atan2(y2-y1,x2-x1); k=6
  d.add(Polygon([x2,y2,x2-k*math.cos(a-.45),y2-k*math.sin(a-.45),x2-k*math.cos(a+.45),y2-k*math.sin(a+.45)],fillColor=TEAL,strokeColor=TEAL))
 box(0,157,130,69,'Navegador',['Token solo en memoria','Crear / listar / recuperar'])
 box(178,157,130,69,'Container Apps',['Next.js: web y API','Identidad administrada'])
 box(357,157,130,69,'Blob Storage',['JSON sintético Q50','Contenedor privado'])
 arrow(130,191,178,191); arrow(308,191,357,191)
 d.add(String(154,205,'HTTPS',fontSize=7,textAnchor='middle',fillColor=GRAY));d.add(String(333,205,'JSON',fontSize=7,textAnchor='middle',fillColor=GRAY))
 box(0,28,130,72,'Container Registry',['Dockerfile + ACR Tasks','Imagen sin credenciales'])
 box(178,28,130,72,'Identidad / RBAC',['Datos al contenedor','AcrPull al registro'])
 box(357,28,130,72,'Secreto de la app',['DEMO_TOKEN','Key Vault queda futuro'])
 arrow(65,100,196,157);arrow(243,100,243,157);arrow(421,100,292,157)
 d.add(String(243,9,'Preparado en código y scripts. Despliegue remoto pendiente.',fontName='Helvetica-Bold',fontSize=9,textAnchor='middle',fillColor=NAVY))
 return d
class DiagramFlow(Flowable):
 def __init__(self,d):Flowable.__init__(self);self.d=d;self.width=d.width;self.height=d.height
 def draw(self):renderPDF.draw(self.d,self.canv,0,0)
def footer(c,doc):
 c.setStrokeColor(TEAL);c.line(54,799,541,799)
 c.setFont('Helvetica',8);c.setFillColor(GRAY);c.drawString(54,810,'GALILEO / FISICC  |  CLOUD COMPUTING 2026')
 c.drawString(54,31,'Avance técnico - 16/10/2026 - Sin despliegue remoto verificado')
 c.drawRightString(541,31,str(doc.page))
story=[]
def add(s,style='BodyCustom'):story.append(para(s,style))
def sec(s):add(s,'SectionCustom')
add('M2 / AVANCE EN AZURE','SmallCustom');story.append(Spacer(1,14))
add('Asistente de gestión<br/>para pequeños negocios','TitleCustom')
add('Arquitectura y avance técnico<br/>16 de octubre de 2026 · Guatemala','SubtitleCustom')
story.append(table([['Integrante','Carné'],['Lizardo Gonzalez','24000682'],['Jessel Contreras','23011020']],[330,157]))
sec('Qué resuelve')
add('Una herramienta en español para registrar ventas y gastos de pequeños negocios guatemaltecos. La versión final propondrá movimientos a partir de texto y pedirá confirmación antes de guardarlos. Los importes se expresan en quetzales.')
sec('Alcance de esta versión')
add('La demo crea un comprobante sintético de <b>Q50</b>, lo guarda como JSON privado y lo recupera por el mismo identificador. IA, inventario, dashboard y autenticación final de usuarios continúan pendientes.')
story.append(table([['Requisito reportado para M2','Estado al cierre'],['Cuenta/proyecto configurado','Cuenta Azure reportada por el equipo; sin verificación de suscripción.'],['Dos servicios desplegados','Pendiente: Container Apps + Blob Storage.'],['Diagrama de arquitectura','Fuente editable y exportación incluidas; arquitectura propuesta.']],[235,252]))
add('<b>Estado:</b> código migrado y validado en local. No se declara M2 completo ni existen URL o evidencias remotas verificadas. Los requisitos provienen del TXT recibido; falta contrastar el Word académico.','SmallCustom')
story.append(PageBreak())
sec('Arquitectura M2 preparada')
add('Se conservó la aplicación Next.js del equipo y se reemplazó el SDK de Google Cloud por Azure Blob Storage y Azure Identity. El diagrama describe lo que desplegarán los scripts; ningún recurso se presenta como desplegado.')
story.append(DiagramFlow(diagram()))
sec('Flujo de la demostración')
for line in ['1. El usuario abre la web e ingresa el token de demo; el navegador lo conserva solo en memoria.','2. El backend valida el token y genera un UUID v4 y datos sintéticos por Q50.','3. La identidad administrada solicita acceso a Azure y escribe el JSON en el contenedor privado.','4. El backend descarga el objeto antes de responder 201. Una petición GET posterior recupera el mismo ID.']:
 add(line)
sec('Controles preparados')
add('Storage sin acceso público ni claves compartidas; HTTPS y TLS 1.2 mínimo. Permisos de datos acotados al contenedor y AcrPull al registro. El token se configura como secreto de Container Apps y queda fuera de la imagen y el ZIP. Los errores registran códigos acotados, sin cabeceras ni mensajes completos del SDK.')
add('Mínimo 0 y máximo 2 réplicas, con 0.25 CPU/0.5 GiB por réplica. Esto no es un límite monetario. ACR y almacenamiento pueden generar consumo aunque la aplicación escale a cero.','SmallCustom')
story.append(PageBreak())
sec('Implementación y validación local')
add('Next.js se actualizó a <b>16.4.1</b> por el parche oficial del 14/10/2026. SDKs: Azure Blob Storage 12.34.0 y Azure Identity 4.14.0. El lockfile fue regenerado y el SDK Google fue retirado.')
story.append(table([['Comprobación','Resultado / alcance'],['Tipos y compilación Next.js','Aprobados en Windows, Node 24. Docker usa Node 22; imagen no construida aquí.'],['13 comprobaciones HTTP locales','Aprobadas. Evidencia: evidencias/pruebas-locales.json.'],['Dependencias','npm informó 0 vulnerabilidades tras retirar el SDK Google. Repetir revisión antes de publicar.'],['Escritura/lectura Azure','Pendiente; no se usaron datos simulados para afirmar integración.']],[195,292]))
sec('Qué se probó')
add('Health y las tres páginas responden 200. Crear, listar y consultar estado sin token se rechazan con 401; también se rechaza un token incorrecto. Identificadores mal formados devuelven 400. Sin Azure configurado, escribir y leer fallan de forma controlada; la pantalla de estado no simula servicios activos.')
sec('Qué se corrigió')
add('Validación estricta de UUID v4; listado limitado a una muestra de 100 objetos y hasta 20 resultados; credencial de Azure sin claves permanentes; logs acotados; pruebas de privacidad que no aceptan errores de red como evidencia de protección. La muestra no garantiza contener los objetos más recientes de todo el contenedor.')
sec('Evidencias que faltan en Azure')
add('Suscripción habilitada y acceso individual; recursos reales y revisión disponible; health 200; creación 201; objeto visible en Storage; recuperación posterior idéntica; rechazo sin token; acceso anónimo denegado; controles de privacidad y log con el mismo identificador.')
add('El script remoto guarda evidencia-http-m2.json sin el token. Compara el contenido completo en una nueva petición y separa las comprobaciones HTTP de las evidencias administrativas pendientes.','SmallCustom')
story.append(PageBreak())
sec('Ruta a siete servicios cloud')
add('Propuesta para la entrega final en Azure. Su aceptación académica se debe contrastar con el Word/docente. No se presupone que identidad y permisos cuenten como un servicio independiente.')
story.append(table([['Servicio','Función','Estado'],['Container Apps','Web y API','Código preparado'],['Blob Storage','Comprobantes privados','SDK preparado'],['Container Registry','Imágenes / compilación','Script preparado'],['Database for PostgreSQL','Negocios y movimientos','Planeado'],['IA de Azure','Texto a propuestas','Modelo por confirmar'],['Key Vault','Secretos centralizados','Planeado'],['Monitor / Log Analytics','Métricas, logs y alertas','Planeado']],[155,192,140]))
sec('Siguiente paso con Jessel')
add('Abrir Azure Portal > Suscripciones y verificar nombre, ID, estado y créditos reales. Otorgar acceso individual al compañero mediante IAM. Revisar región, cuotas y presupuesto antes de crear recursos. No compartir contraseñas ni activar pago automáticamente.')
add('La guía docs/despliegue.md separa acceso, preparación, publicación y pruebas. Los scripts requieren los nombres reales y no fueron ejecutados contra Azure. Secreto propio de Container Apps y logs de consola se usan en M2; Key Vault y Monitor permanecen planeados.')
sec('Registro de infraestructura pendiente')
add('Suscripción / grupo / región: por verificar.<br/>Aplicación / URL HTTPS / revisión lista: por verificar.<br/>Cuenta Storage / contenedor / identidad / ACR: por verificar.')
sec('Fuentes y archivos editables')
add('Microsoft Learn: identidad administrada de Container Apps; descarga de imágenes con identidad; inicio rápido Blob Storage para JavaScript; referencias CLI de containerapp y storage container-rm. Next.js: aviso de seguridad del 14/10/2026. Enlaces completos en docs/avance-M2.md y docs/despliegue.md.','SmallCustom')
add('Fuentes editables: docs/avance-M2.md, docs/arquitectura-provisional.mmd y docs/arquitectura-provisional.svg. No se envió ninguna entrega a GES.','SmallCustom')
renderSVG.drawToFile(diagram(),str(ROOT/'docs/arquitectura-provisional.svg'))
doc=SimpleDocTemplate(str(OUT/'M2_Arquitectura_y_Avance_Azure.pdf'),pagesize=A4,rightMargin=54,leftMargin=54,topMargin=62,bottomMargin=53,title='M2 - Arquitectura y avance Azure',author='Lizardo Gonzalez y Jessel Contreras')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT/'M2_Arquitectura_y_Avance_Azure.pdf')
