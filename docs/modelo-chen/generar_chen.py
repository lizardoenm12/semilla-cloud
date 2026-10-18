"""Genera láminas SVG Chen. Ejecutar desde la raíz: python docs/modelo-chen/generar_chen.py"""
from pathlib import Path
from xml.sax.saxutils import escape
import json
OUT=Path(__file__).resolve().parent
META=[]
class Chen:
 def __init__(self,name,title,sub,w=3000,h=1950):
  self.name=name;self.w=w;self.h=h;self.edges=[];self.nodes=[];self.items=[]
  self.header=f'<rect width="{w}" height="{h}" fill="white"/><text x="85" y="70" class="title">{escape(title)}</text><text x="85" y="111" class="sub">{escape(sub)}</text><text x="85" y="148" class="small">Asistente de negocios · Lizardo Gonzalez 24000682 · Jessel Contreras 23011020 · 17/10/2026</text>'
 def line(self,points,total=False):
  self.edges.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="#111" stroke-width="{6 if total else 2}" stroke-linejoin="round"/>')
 def label(self,x,y,text):
  self.nodes.append(f'<rect x="{x-22}" y="{y-24}" width="44" height="32" fill="white"/><text x="{x}" y="{y}" class="card" text-anchor="middle">{escape(text)}</text>')
 def attr(self,x,y,name,key=False,partial=False,owner=None):
  rx=max(100,len(name)*5.6+18);ry=33
  if owner:self.line([owner,(x,y)])
  self.nodes.append(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="white" stroke="#111" stroke-width="2"/><text x="{x}" y="{y+6}" class="attr" text-anchor="middle"'+(' text-decoration="underline"' if key else '')+f'>{escape(name)}</text>')
  if partial:
   tw=len(name)*9.1
   self.nodes.append(f'<line x1="{x-tw/2}" y1="{y+12}" x2="{x+tw/2}" y2="{y+12}" stroke="#111" stroke-width="1.8" stroke-dasharray="6 4"/>')
 def entity(self,x,y,name,attrs,weak=False):
  self.items.append({'entidad':name,'debil':weak,'atributos':[a[0] for a in attrs]})
  positions=[(-310,-150),(-175,-300),(175,-300),(310,-150),(-310,150),(-175,300),(175,300),(310,150)]
  # Clave en óvalo independiente: siempre se dibuja, nunca dentro del rectángulo.
  for (label,typ),(dx,dy) in zip(attrs,positions):self.attr(x+dx,y+dy,label,key=typ=='pk',partial=typ=='partial',owner=(x,y))
  width=max(250,len(name)*15+60);height=80
  self.nodes.append(f'<rect x="{x-width/2}" y="{y-height/2}" width="{width}" height="{height}" fill="white" stroke="#111" stroke-width="2.3"/>')
  if weak:self.nodes.append(f'<rect x="{x-width/2+7}" y="{y-height/2+7}" width="{width-14}" height="{height-14}" fill="none" stroke="#111" stroke-width="2.3"/>')
  self.nodes.append(f'<text x="{x}" y="{y+7}" class="entity" text-anchor="middle">{escape(name)}</text>')
  return width/2
 def diamond(self,x,y,name,ident=False):
  rx=max(115,len(name)*7);ry=67
  self.nodes.append(f'<polygon points="{x-rx},{y} {x},{y-ry} {x+rx},{y} {x},{y+ry}" fill="white" stroke="#111" stroke-width="2.3"/>')
  if ident:self.nodes.append(f'<polygon points="{x-rx+12},{y} {x},{y-ry+8} {x+rx-12},{y} {x},{y+ry-8}" fill="none" stroke="#111" stroke-width="2.3"/>')
  self.nodes.append(f'<text x="{x}" y="{y+6}" class="relation" text-anchor="middle">{escape(name)}</text>')
 def note(self,x,y,text):self.nodes.append(f'<text x="{x}" y="{y}" class="small">{escape(text)}</text>')
 def save(self):
  css='text{font-family:Arial,sans-serif;fill:#111}.title{font-size:36px;font-weight:700}.sub{font-size:23px}.small{font-size:20px}.entity{font-size:24px;font-weight:700}.attr{font-size:20px}.card{font-size:25px;font-weight:700}.relation{font-size:21px}'
  legend=[f'<line x1="85" y1="{self.h-142}" x2="165" y2="{self.h-142}" stroke="black" stroke-width="6"/><text x="185" y="{self.h-135}" class="small">Participación total</text>',f'<line x1="570" y1="{self.h-142}" x2="650" y2="{self.h-142}" stroke="black" stroke-width="2"/><text x="670" y="{self.h-135}" class="small">Participación parcial</text>',f'<text x="1130" y="{self.h-135}" class="small">1 / N / M = cardinalidad máxima · PK subrayada · clave parcial con subrayado discontinuo</text>',f'<text x="85" y="{self.h-85}" class="small">Modelo conceptual ampliado. Implementación local parcial en SQLite; sin recursos cloud. Las entidades repetidas son la misma entidad.</text>']
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}"><style>{css}</style>{self.header}{"".join(self.edges)}{"".join(self.nodes)}{"".join(legend)}</svg>'
  (OUT/(self.name+'.svg')).write_text(svg,encoding='utf-8');META.append({'lamina':self.name,'entidades':self.items})
U=[('id_usuario','pk'),('identidad_externa',''),('nombre',''),('email',''),('creado_en','')]
N=[('id_negocio','pk'),('nombre',''),('moneda = GTQ',''),('zona_horaria',''),('etapa',''),('idea',''),('cliente_objetivo',''),('propuesta_valor','')]
P=[('id_producto','pk'),('sku',''),('nombre',''),('precio_venta_gtq',''),('controla_stock',''),('activo','')]
M=[('id_movimiento','pk'),('tipo',''),('total_gtq',''),('estado',''),('ocurrido_en','')]
AI=[('id_propuesta','pk'),('texto_original',''),('datos_propuestos',''),('datos_confirmados',''),('estado',''),('creado_en','')]
C=[('id_comprobante','pk'),('ruta_blob',''),('mime_type',''),('creado_en','')]
D=[('numero_linea','partial'),('descripcion',''),('cantidad',''),('precio_unitario_gtq',''),('subtotal_gtq','')]
I=[('id_entrada','pk'),('cantidad_delta',''),('motivo',''),('ocurrido_en','')]
# 1. Membresía es una relación conceptual M:N con sus propios atributos.
s=Chen('01-acceso-catalogo','1. Acceso a negocios y catálogo','Chen: entidades en rectángulos, relaciones en rombos y atributos en óvalos.',h=1250)
u=s.entity(450,550,'USUARIO',U);n=s.entity(1500,550,'NEGOCIO',N);p=s.entity(2550,550,'PRODUCTO',P)
s.diamond(975,550,'MEMBRESÍA');s.line([(450+u,550),(860,550)]);s.line([(1090,550),(1500-n,550)],True);s.label(690,530,'M');s.label(1245,530,'N')
s.attr(975,280,'rol',owner=(975,550));s.attr(865,820,'activa',owner=(975,550));s.attr(1085,820,'desde',owner=(975,550))
s.diamond(2025,550,'ADMINISTRA');s.line([(1500+n,550),(1910,550)]);s.line([(2140,550),(2550-p,550)],True);s.label(1750,530,'1');s.label(2300,530,'N')
s.note(85,980,'Regla: todo negocio tiene al menos una membresía; debe existir al menos un propietario activo.')
s.note(85,1020,'sku es único por negocio; id_producto es global. No se duplican claves foráneas como atributos en el modelo conceptual.')
s.save()
# 2. Movimiento y comprobante, con autor explícito.
s=Chen('02-movimientos-comprobantes','2. Movimientos, autoría y comprobantes','Ventas, compras y gastos confirmados; propuestas de IA todavía no modifican dinero ni stock.')
n=s.entity(450,550,'NEGOCIO',N);m=s.entity(1500,550,'MOVIMIENTO',M);c=s.entity(2550,550,'COMPROBANTE',C);u=s.entity(1500,1370,'USUARIO',U)
s.diamond(975,550,'REGISTRA');s.line([(450+n,550),(860,550)]);s.line([(1090,550),(1500-m,550)],True);s.label(690,530,'1');s.label(1245,530,'N')
s.diamond(2025,550,'RESPALDA');s.line([(1500+m,550),(1910,550)]);s.line([(2140,550),(2550-c,550)],True);s.label(1750,530,'1');s.label(2300,530,'N')
s.diamond(1500,990,'AUTORÍA');s.line([(1500,590),(1500,923)],True);s.line([(1500,1057),(1500,1330)]);s.label(1535,905,'N');s.label(1535,1100,'1')
s.note(85,1715,'Cada movimiento pertenece a un negocio y tiene un autor; cada comprobante respalda exactamente un movimiento.')
s.note(85,1755,'El autor debe tener una membresía activa y con permiso en el mismo negocio. El comprobante tiene identidad propia.')
s.save()
# 3. IA como propuesta opcional; negocio y autor obligatorios.
s=Chen('03-propuestas-ia','3. Propuestas de IA y confirmación','Una propuesta puede contener varias operaciones. El modo local interpreta por reglas, sin un modelo de IA.')
u=s.entity(450,550,'USUARIO',U);a=s.entity(1500,550,'PROPUESTA_IA',AI);m=s.entity(2550,550,'MOVIMIENTO',M);n=s.entity(1500,1370,'NEGOCIO',N)
s.diamond(975,550,'SOLICITA');s.line([(450+u,550),(860,550)]);s.line([(1090,550),(1500-a,550)],True);s.label(690,530,'1');s.label(1245,530,'N')
s.diamond(2025,550,'ORIGINA');s.line([(1500+a,550),(1910,550)]);s.line([(2140,550),(2550-m,550)],True);s.label(1750,530,'1');s.label(2300,530,'N')
s.diamond(1500,990,'CONTEXTUALIZA');s.line([(1500,590),(1500,923)],True);s.line([(1500,1057),(1500,1330)]);s.label(1535,905,'N');s.label(1535,1100,'1')
s.note(85,1715,'ORIGINA es 1:N: una frase puede generar venta y gasto. La propuesta se confirma una sola vez, en una transacción.')
s.note(85,1755,'Cada movimiento local proviene de una propuesta, incluso si se corrige a mano. Los ajustes pueden generar solo inventario.')
s.save()
# 4. Detalle débil: se sustituye su UUID independiente por número de línea local.
s=Chen('04-detalle-inventario','4. Detalle débil e inventario','Doble rectángulo = entidad débil · doble rombo = relación identificadora.')
m=s.entity(450,550,'MOVIMIENTO',M);d=s.entity(1500,550,'DETALLE_MOVIMIENTO',D,True);p=s.entity(2550,550,'PRODUCTO',P);i=s.entity(2550,1370,'ENTRADA_INVENTARIO',I)
s.diamond(975,550,'CONTIENE',True);s.line([(450+m,550),(860,550)]);s.line([(1090,550),(1500-d,550)],True);s.label(690,530,'1');s.label(1245,530,'N')
s.diamond(2025,550,'REFERENCIA');s.line([(1500+d,550),(1910,550)]);s.line([(2140,550),(2550-p,550)]);s.label(1750,530,'N');s.label(2300,530,'1')
s.diamond(2550,990,'TIENE');s.line([(2550,590),(2550,923)]);s.line([(2550,1057),(2550,1330)],True);s.label(2585,905,'1');s.label(2585,1100,'N')
s.diamond(2025,1370,'GENERA');s.line([(1500,590),(1500,1370),(1910,1370)]);s.line([(2140,1370),(2550-i,1370)]);s.label(1810,1350,'1');s.label(2270,1350,'N')
s.note(85,1590,'DETALLE se identifica por (id_movimiento, numero_linea). numero_linea es clave parcial, no una PK global.')
s.note(85,1630,'REFERENCIA es opcional: un gasto puede tener detalle sin producto. Toda entrada de inventario tiene un producto.')
s.note(85,1670,'GENERA es parcial en ambos extremos: ajustes/saldos iniciales no necesitan detalle; productos sin stock no generan entradas.')
s.note(85,1710,'El total de un movimiento puede existir sin detalle para gastos; ventas y compras requieren al menos una línea (regla por tipo).')
s.note(85,1750,'ENTRADA_INVENTARIO es el nuevo rótulo conceptual de MOVIMIENTO_INVENTARIO; conserva un identificador global propio.')
s.save()
# Ejemplo de la foto: separado del proyecto para evitar introducir clientes/pedidos ajenos a su alcance.
s=Chen('05-ejemplo-foto-corregido','5. Ejemplo de la foto, corregido','Supuestos: cada pedido tiene un cliente y al menos un artículo; un artículo puede no haber sido pedido.',w=2500,h=1850)
s.entity(450,500,'CLIENTE',[('DNI','pk'),('nombre','')]);s.entity(1500,500,'PEDIDO',[('id_pedido','pk'),('fecha','')]);s.entity(1500,1350,'ARTÍCULO',[('num_serie','pk'),('descripcion','')])
s.diamond(950,500,'REALIZA');s.line([(575,500),(835,500)]);s.line([(1065,500),(1375,500)],True);s.label(700,480,'1');s.label(1200,480,'N')
s.diamond(1500,940,'SE COMPONE');s.line([(1500,540),(1500,873)],True);s.line([(1500,1007),(1500,1310)]);s.label(1535,840,'N');s.label(1535,1070,'M');s.attr(1860,940,'cantidad',owner=(1500,940))
s.note(85,1630,'Fecha queda sin subrayar. Cantidad pertenece al rombo SE COMPONE. Pedido tiene clave propia, por eso no es débil.')
# Leyenda reducida para esta lámina más estrecha.
s.save()

# Ampliación del producto: identidad productiva, acompañamiento y aprendizaje.
E=[('id_evaluacion','pk'),('metodo',''),('creado_en','')]
A=[('id_arquetipo','pk'),('nombre',''),('descripcion',''),('orientacion','')]
s=Chen('06-arquetipos-perfil','6. Perfil del emprendedor y arquetipos','El arquetipo se elige de forma explícita; se conserva el historial. No es un diagnóstico psicológico.',h=1250)
u=s.entity(450,550,'USUARIO',U);e=s.entity(1500,550,'EVALUACION_ARQUETIPO',E);a=s.entity(2550,550,'ARQUETIPO',A)
s.diamond(975,550,'REALIZA');s.line([(450+u,550),(860,550)]);s.line([(1090,550),(1500-e,550)],True);s.label(690,530,'1');s.label(1245,530,'N')
s.diamond(2025,550,'ASIGNA');s.line([(1500+e,550),(1910,550)],True);s.line([(2140,550),(2550-a,550)]);s.label(1750,530,'N');s.label(2300,530,'1')
s.note(85,980,'Perfil actual = última evaluación del usuario. En SQLite se conserva además una referencia al arquetipo actual.')
s.note(85,1020,'Catálogo inicial: Equilibristas Esforzados, Pioneros Metódicos, Forjador Silencioso y Protectores Cautelosos.')
s.save()
DG=[('id_diagnostico','pk'),('organizacion',''),('registros',''),('formalidad_declarada',''),('creado_en','')]
PL=[('id_plan','pk'),('titulo',''),('creado_en','')]
AC=[('id_accion','pk'),('titulo',''),('motivo',''),('estado','')]
s=Chen('07-diagnostico-plan','7. Diagnóstico del negocio y plan de mejora','Las respuestas son una autoevaluación; no determinan obligaciones ni riesgos fiscales.')
n=s.entity(450,550,'NEGOCIO',N);d=s.entity(1500,550,'DIAGNOSTICO',DG);p=s.entity(2550,550,'PLAN_MEJORA',PL);a=s.entity(2550,1370,'ACCION_MEJORA',AC)
s.diamond(975,550,'RECIBE');s.line([(450+n,550),(860,550)]);s.line([(1090,550),(1500-d,550)],True);s.label(690,530,'1');s.label(1245,530,'N')
s.diamond(2025,550,'ORIENTA');s.line([(1500+d,550),(1910,550)]);s.line([(2140,550),(2550-p,550)],True);s.label(1750,530,'1');s.label(2300,530,'1')
s.diamond(2550,990,'CONTIENE');s.line([(2550,590),(2550,923)]);s.line([(2550,1057),(2550,1330)],True);s.label(2585,905,'1');s.label(2585,1100,'N')
s.note(85,1715,'Primera versión: un plan actual por negocio, orientado por su último diagnóstico. El historial de diagnósticos se conserva.')
s.note(85,1755,'Las acciones se actualizan sin duplicar su código ni borrar su avance. Los planes históricos versionados quedan para una etapa posterior.')
s.save()
LE=[('id_contenido','pk'),('titulo',''),('minutos',''),('contenido',''),('actividad','')]
s=Chen('08-aprendizaje','8. Aprendizaje integrado','Lecturas breves vinculadas a las tareas del negocio; el avance acompaña al usuario.',h=1250)
u=s.entity(650,550,'USUARIO',U);l=s.entity(2350,550,'CONTENIDO_EDUCATIVO',LE)
s.diamond(1500,550,'COMPLETA');s.line([(650+u,550),(1385,550)]);s.line([(1615,550),(2350-l,550)]);s.label(1100,530,'M');s.label(1950,530,'N');s.attr(1500,830,'completado_en',owner=(1500,550))
s.note(85,1000,'COMPLETA se materializa como progreso con clave (usuario, contenido). Una lectura no se cuenta dos veces.')
s.save()
CO=[('id_conversacion','pk'),('creado_en','')]
ME=[('id_mensaje','pk'),('rol',''),('contenido',''),('creado_en','')]
s=Chen('09-conversaciones','9. Espacio para pensar con acompañamiento','La primera versión guarda conversaciones con respuestas locales por reglas, sin IA generativa.')
n=s.entity(450,550,'NEGOCIO',N);c=s.entity(1500,550,'CONVERSACION',CO);u=s.entity(2550,550,'USUARIO',U);m=s.entity(1500,1370,'MENSAJE',ME)
s.diamond(975,550,'CONTEXTUALIZA');s.line([(450+n,550),(860,550)]);s.line([(1090,550),(1500-c,550)],True);s.label(690,530,'1');s.label(1245,530,'N')
s.diamond(2025,550,'PARTICIPA');s.line([(1500+c,550),(1910,550)],True);s.line([(2140,550),(2550-u,550)]);s.label(1750,530,'N');s.label(2300,530,'1')
s.diamond(1500,990,'CONTIENE');s.line([(1500,590),(1500,923)]);s.line([(1500,1057),(1500,1330)],True);s.label(1535,905,'1');s.label(1535,1100,'N')
s.note(85,1715,'En local hay un hilo por pareja usuario-negocio y se muestra una ventana de 50 mensajes; el resto permanece en SQLite.')
s.note(85,1755,'El asistente generativo, la memoria semántica y la evaluación de sus respuestas se incorporarán posteriormente.')
s.save()
PR=[('id_proyeccion','pk'),('horizonte',''),('supuestos',''),('metodo_version',''),('resultado',''),('creado_en','')]
s=Chen('10-proyecciones-futuro','10. Proyecciones: diseño para la siguiente fase','Planeado; no hay proyecciones calculadas ni predicciones de IA en la primera versión local.',h=1250)
n=s.entity(450,550,'NEGOCIO',N);p=s.entity(1500,550,'PROYECCION',PR);u=s.entity(2550,550,'USUARIO',U)
s.diamond(975,550,'CONTEXTUALIZA');s.line([(450+n,550),(860,550)]);s.line([(1090,550),(1500-p,550)],True);s.label(690,530,'1');s.label(1245,530,'N')
s.diamond(2025,550,'SOLICITA');s.line([(1500+p,550),(1910,550)],True);s.line([(2140,550),(2550-u,550)]);s.label(1750,530,'N');s.label(2300,530,'1')
s.note(85,980,'Guardar horizonte, supuestos, método y datos de origen permite explicar un escenario en lugar de presentar cifras inventadas.')
s.note(85,1020,'El dashboard y el Perfil Productivo Digital se componen de datos operativos, historial, aprendizaje y evaluaciones; no son tablas monolíticas.')
s.save()

(OUT/'estructura.json').write_text(json.dumps(META,ensure_ascii=False,indent=2),encoding='utf-8')
print('Modelo Chen ampliado: diez láminas generadas')
