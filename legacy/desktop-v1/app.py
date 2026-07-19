
import json
import tkinter as tk
from tkinter import ttk, messagebox

# ---------- CARGAR RECETAS ----------
with open('recetas.json', 'r', encoding='utf-8') as f:
    RECETAS = json.load(f)


class RecetarioApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title('Calculadora de Insumos - Recetario')
        self.geometry('900x600')
        self.create_scrollable_layout()
        self.create_widgets()

    # ---------- LAYOUT SCROLLEABLE ----------
    def create_scrollable_layout(self):
        container = tk.Frame(self)
        container.pack(fill='both', expand=True)
        self.canvas = tk.Canvas(container)
        scrollbar = ttk.Scrollbar(container, orient='vertical', command=self.canvas.yview)
        self.main_frame = tk.Frame(self.canvas)
        self.main_frame.bind(
            '<Configure>',
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox('all'))
        )
        self.canvas.create_window((0, 0), window=self.main_frame, anchor='nw')
        self.canvas.configure(yscrollcommand=scrollbar.set)
        self.canvas.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        # Scroll solo cuando el mouse está sobre la vista principal
        self.canvas.bind('<Enter>', lambda e: self.canvas.bind_all('<MouseWheel>', self._on_mousewheel))
        self.canvas.bind('<Leave>', lambda e: self.canvas.unbind_all('<MouseWheel>'))

    def _on_mousewheel(self, event):
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')

    # ---------- WIDGETS ----------
    def create_widgets(self):
        tk.Label(self.main_frame, text='Selecciona el tipo de preparación:', font=('Arial', 12, 'bold')).pack(pady=(10, 5))
        self.producto_var = tk.StringVar()
        self.producto_combo = ttk.Combobox(
            self.main_frame,
            textvariable=self.producto_var,
            state='readonly',
            values=list(RECETAS.keys())
        )
        self.producto_combo.current(0)
        self.producto_combo.pack(pady=5)
        self.producto_combo.bind('<<ComboboxSelected>>', self.mostrar_ingredientes)
        # Frame de inputs primero
        frame_inputs = tk.Frame(self.main_frame, bd=2, relief='groove', padx=10, pady=10, bg='#f7f7fa')
        frame_inputs.pack(pady=(0, 10))

        # Luego el frame horizontal con los 3 frames
        frame_horizontal = tk.Frame(self.main_frame, bg='#f7f7fa', width=900)
        frame_horizontal.pack(fill='x', padx=10, pady=(5, 0))

        frame_left = tk.Frame(frame_horizontal, bg='#f7f7fa', width=300)
        frame_left.pack(side='left', fill='both', expand=True)
        self.label_registro_text = tk.Label(frame_left, text='Registro Sanitario:', font=('Arial', 10), bg='#f7f7fa', anchor='w')
        self.label_registro_text.pack(side='left', padx=(10,0), pady=5)
        self.label_registro_codigo = tk.Label(frame_left, text='', font=('Arial', 10, 'bold'), bg='#f7f7fa', anchor='w', fg='#357ab8', width=22)
        self.label_registro_codigo.pack(side='left', padx=(2,0), pady=5)

        frame_center = tk.Frame(frame_horizontal, bg='#f7f7fa', width=300)
        frame_center.pack(side='left', fill='both', expand=True)
        self.btn_mostrar = tk.Button(frame_center, text='Mostrar ingredientes', command=self.mostrar_ingredientes, font=('Arial', 11, 'bold'), bg='#4a90e2', fg='white', relief='raised', bd=2, padx=10, pady=4, activebackground='#357ab8')
        self.btn_mostrar.pack(anchor='w', pady=5, padx=(80,0))

        frame_right = tk.Frame(frame_horizontal, bg='#f7f7fa', width=300)
        frame_right.pack(side='right', fill='both', expand=True)
        self.btn_preparacion = tk.Button(frame_right, text='Preparación', font=('Arial', 11, 'bold'), bg='#357ab8', fg='white', relief='raised', bd=2, padx=10, pady=4, activebackground='#245a8d', command=self.mostrar_preparacion)
        self.btn_preparacion.pack(side='right', padx=(0,10), pady=5)
        frame_inputs.grid_columnconfigure(0, weight=1)
        frame_inputs.grid_columnconfigure(1, weight=1)
        frame_inputs.grid_columnconfigure(2, weight=1)
        frame_inputs.grid_columnconfigure(3, weight=1)
        frame_inputs.grid_columnconfigure(4, weight=1)
        frame_inputs.grid_columnconfigure(5, weight=1)
        frame_inputs.grid_columnconfigure(6, weight=1)
        frame_inputs.pack_configure(anchor='center')
        tk.Label(frame_inputs, text='Cantidad de envases:', bg='#f7f7fa', font=('Arial', 10)).grid(row=0, column=0, padx=5, pady=3)
        self.cantidad_envases_var = tk.IntVar(value=1)
        tk.Entry(frame_inputs, textvariable=self.cantidad_envases_var, width=10, font=('Arial', 10)).grid(row=0, column=1, padx=5, pady=3)
        tk.Label(frame_inputs, text='Gramaje por envase (g):', bg='#f7f7fa', font=('Arial', 10)).grid(row=0, column=2, padx=5, pady=3)
        self.gramaje_envase_var = tk.DoubleVar(value=180)
        tk.Entry(frame_inputs, textvariable=self.gramaje_envase_var, width=10, font=('Arial', 10)).grid(row=0, column=3, padx=5, pady=3)
        tk.Label(frame_inputs, text='Costo envase + tapa:', bg='#f7f7fa', font=('Arial', 10)).grid(row=0, column=4, padx=5, pady=3)
        self.costo_envase_var = tk.DoubleVar(value=0)
        tk.Entry(frame_inputs, textvariable=self.costo_envase_var, width=10, font=('Arial', 10)).grid(row=0, column=5, padx=5, pady=3)
        frame_tabla = tk.Frame(self.main_frame, bd=2, relief='groove', padx=5, pady=5, bg='#f7f7fa')
        frame_tabla.pack(fill='both', expand=True, padx=10, pady=(0, 10))
        self.tree = ttk.Treeview(
            frame_tabla,
            columns=('Ingrediente', 'Porcentaje', 'Cantidad (g)', 'Cantidad (kg)', 'Precio kg', 'Precio total'),
            show='headings',
            height=17,  # Aumentado para mostrar una fila extra
            style='Unified.Treeview'
        )
        columnas = [
            ('Ingrediente', 247),
            ('Porcentaje', 247),
            ('Cantidad (g)', 247),
            ('Cantidad (kg)', 247),
            ('Precio kg', 247),
            ('Precio total', 247)
        ]
        for col, w in columnas:
            self.tree.heading(col, text=col, anchor='center',)
            self.tree.column(col, width=w, anchor='center')
        self.tree.pack(fill='both', expand=True, pady=10)
        tk.Label(self.main_frame, text='Costos', font=('Arial', 12, 'bold')).pack(pady=(10, 0))
        frame_costos = tk.Frame(self.main_frame, bd=2, relief='groove', padx=5, pady=5, bg='#f7f7fa')
        frame_costos.pack(fill='both', expand=True, padx=10, pady=(0, 10))
        self.tree_costos = ttk.Treeview(
            frame_costos,
            columns=('Concepto', 'Porcentaje', 'Valor'),
            show='headings',
            height=14,
            style='Unified.Treeview'
        )
        self.tree_costos.heading('Concepto', text='Concepto', anchor='center')
        self.tree_costos.heading('Porcentaje', text='Porcentaje', anchor='center')
        self.tree_costos.heading('Valor', text='Valor', anchor='center')
        self.tree_costos.column('Concepto', width=250, anchor='center')
        self.tree_costos.column('Porcentaje', width=120, anchor='center')
        self.tree_costos.column('Valor', width=150, anchor='center')
        self.tree_costos.pack(fill='both', expand=True, pady=10)
        frame_dos_tablas = tk.Frame(self.main_frame)
        frame_dos_tablas.pack(fill='x', padx=10, pady=(0, 10))
        frame_izq = tk.Frame(frame_dos_tablas)
        frame_izq.pack(side='left', fill='both', expand=True, padx=(0,5))
        tk.Label(frame_izq, text='Ganancia', font=('Arial', 11, 'bold')).pack(pady=(0,2))
        self.tree_izq = ttk.Treeview(
            frame_izq,
            columns=('Concepto', 'Valor', 'Total'),
            show='headings',
            height=8,
            style='Unified.Treeview'
        )
        for col, ancho in zip(('Concepto', 'Valor', 'Total'), (200, 100, 120)):
            self.tree_izq.heading(col, text=col, anchor='center')
            self.tree_izq.column(col, width=ancho, anchor='center')
        self.tree_izq.pack(fill='both', expand=True)
        frame_der = tk.Frame(frame_dos_tablas)
        frame_der.pack(side='left', fill='both', expand=True, padx=(5,0))
        tk.Label(frame_der, text='Otros precios variables', font=('Arial', 11, 'bold')).pack(pady=(0,2))
        self.tree_der = ttk.Treeview(
            frame_der,
            columns=('Tipo de precio', 'Condición', 'Valor calculado'),
            show='headings',
            height=8,
            style='Unified.Treeview'
        )
        columnas_der = [
            ('Tipo de precio', 160),
            ('Condición', 120),
            ('Valor calculado', 140)
        ]
        for col, w in columnas_der:
            self.tree_der.heading(col, text=col, anchor='center')
            self.tree_der.column(col, width=w, anchor='center')
        self.tree_der.pack(fill='both', expand=True)
        style = ttk.Style()
        style.theme_use('default')
        style.configure('Unified.Treeview.Heading', font=('Arial', 10, 'bold'), background='#e0e7ef', foreground='#222')
        style.configure('Unified.Treeview', font=('Arial', 10), rowheight=24, background='#f5f7fa', fieldbackground='#f5f7fa')
        self.tree.tag_configure('evenrow', background='#f5f7fa')
        self.tree.tag_configure('oddrow', background='#eaf1fb')
        self.tree_costos.tag_configure('evenrow', background='#f5f7fa')
        self.tree_costos.tag_configure('oddrow', background='#eaf1fb')
        self.tree_izq.tag_configure('evenrow', background='#f5f7fa')
        self.tree_izq.tag_configure('oddrow', background='#eaf1fb')

    def mostrar_preparacion(self):
        producto = self.producto_var.get()
        pasos = RECETAS.get(producto, {}).get('preparacion', ['No hay pasos definidos'])
        win = tk.Toplevel(self)
        win.title(f'Preparación - {producto}')
        win.geometry('700x600')
        tk.Label(win, text=f'Preparación para {producto}', font=('Arial', 12, 'bold')).pack(pady=10)
        frame_text = tk.Frame(win)
        frame_text.pack(fill='both', expand=True, padx=10, pady=10)
        text_widget = tk.Text(frame_text, wrap='word', font=('Arial', 10), height=30)
        text_widget.pack(side='left', fill='both', expand=True)
        yscroll = tk.Scrollbar(frame_text, orient='vertical', command=text_widget.yview)
        yscroll.pack(side='right', fill='y')
        text_widget.config(yscrollcommand=yscroll.set)

        # Independizar el scroll: solo responde al mouse sobre el widget de preparación
        def _on_mousewheel_local(event):
            text_widget.yview_scroll(int(-1 * (event.delta / 120)), 'units')
            return 'break'
        text_widget.bind('<Enter>', lambda e: text_widget.bind_all('<MouseWheel>', _on_mousewheel_local))
        text_widget.bind('<Leave>', lambda e: text_widget.unbind_all('<MouseWheel>'))

        # Definir el tag para títulos
        text_widget.tag_configure('titulo', font=('Arial', 10, 'bold'), foreground='black')
        text_widget.tag_configure('espacio', spacing1=8, spacing3=8)

        for linea in pasos:
            stripped = linea.strip()
            # Detectar títulos y subtítulos
            if (stripped.isupper() and len(stripped) > 3) or any(stripped.startswith(t) for t in ["PROCESO", "NOTAS", "USOS", "RECOMENDACIONES"]):
                text_widget.insert('end', linea + '\n', ('titulo', 'espacio'))
            else:
                text_widget.insert('end', linea + '\n')
        text_widget.config(state='disabled')
        tk.Button(win, text='Volver', command=win.destroy, font=('Arial', 10, 'bold'), bg='#4a90e2', fg='white').pack(pady=15)

    def mostrar_ingredientes(self, event=None):
        # Actualizar solo el código del registro sanitario
        producto = self.producto_var.get()
        registro = RECETAS.get(producto, {}).get('registro_sanitario', '')
        self.label_registro_codigo.config(text=registro)
        self.tree_izq.delete(*self.tree_izq.get_children())
        self.tree.delete(*self.tree.get_children())
        self.tree_costos.delete(*self.tree_costos.get_children())
        self.tree_der.delete(*self.tree_der.get_children())
        if not producto:
            return
        receta = RECETAS[producto]['ingredientes']
        cantidad_envases = self.cantidad_envases_var.get()
        gramaje_envase = self.gramaje_envase_var.get()
        cantidad_total = cantidad_envases * gramaje_envase * 1.1
        total_porcentaje = total_g = total_kg = total_precio_kg = total_precio_total = 0
        for idx, ing in enumerate(receta):
            nombre = ing.get('nombre', '')
            porcentaje = ing.get('porcentaje', 0)
            cantidad_g = round(cantidad_total * (porcentaje / 100), 2)
            cantidad_kg = round(cantidad_g / 1000, 4)
            precio_kg = ing.get('precio_kg', 0)
            precio_total = round(precio_kg * cantidad_kg, 2)
            total_porcentaje += porcentaje
            total_g += cantidad_g
            total_kg += cantidad_kg
            total_precio_kg += precio_kg
            total_precio_total += precio_total
            tag = 'evenrow' if idx % 2 == 0 else 'oddrow'
            self.tree.insert('', 'end', values=(
                nombre,
                f'{porcentaje:.2f}%',
                f'{cantidad_g:,.2f}',
                f'{cantidad_kg:,.4f}',
                f'$ {precio_kg:,.0f}',
                f'$ {precio_total:,.0f}'
            ), tags=(tag,))
        self.tree.insert('', 'end', values=(
            'COSTO PRODUCCION',
            f'{total_porcentaje:.2f}%',
            f'{total_g:,.2f}',
            f'{total_kg:,.4f}',
            f'$ {total_precio_kg:,.0f}',
            f'$ {total_precio_total:,.0f}'
        ), tags=('evenrow' if (len(receta)+1) % 2 == 0 else 'oddrow',))
        costo_formulacion = total_precio_total
        costo_envase = self.costo_envase_var.get() * cantidad_envases
        costos_adicionales = [
            ("Costos Arriendo", 0.10),
            ("Costo Servicios Públicos", 0.05),
            ("Costos Mano de Obra", 0.20),
            ("Costos Transporte", 0.08),
            ("Intereses Préstamo", 0.00),
            ("Cuota Préstamo", 0.00),
            ("Costos Administrativos", 0.15)
        ]
        filas_costos = [
            ('Costo Formulación', '', f'$ {costo_formulacion:,.0f}'),
            ('Costo Envase + Tapa', '', f'$ {costo_envase:,.0f}')
        ]
        for idx, fila in enumerate(filas_costos):
            tag = 'evenrow' if idx % 2 == 0 else 'oddrow'
            self.tree_costos.insert('', 'end', values=fila, tags=(tag,))
        total_otros = 0
        for i, (concepto, porcentaje) in enumerate(costos_adicionales):
            valor = round(costo_formulacion * porcentaje, 2)
            total_otros += valor
            tag = 'evenrow' if (i + len(filas_costos)) % 2 == 0 else 'oddrow'
            self.tree_costos.insert('', 'end', values=(
                concepto,
                f'{porcentaje * 100:.0f}' if porcentaje > 0 else '',
                f'$ {valor:,.0f}' if valor > 0 else ''
            ), tags=(tag,))
        tag = 'evenrow' if (len(filas_costos) + len(costos_adicionales)) % 2 == 0 else 'oddrow'
        self.tree_costos.insert('', 'end', values=('Total Otros Costos', '', f'$ {total_otros:,.0f}'), tags=(tag,))
        suma_formulacion_envase = costo_formulacion + costo_envase
        total_form_env = suma_formulacion_envase * 1.3
        idx_final = len(filas_costos) + len(costos_adicionales) + 1
        self.tree_costos.insert('', 'end', values=(
            'COSTO TOTAL FORMULACION Y ENVASE', '', f'$ {total_form_env:,.0f}'
        ), tags=('evenrow' if idx_final % 2 == 0 else 'oddrow',))
        idx_final += 1
        costo_unidad = (total_otros + total_form_env) / cantidad_envases if cantidad_envases else 0
        self.tree_costos.insert('', 'end', values=(
            'COSTO UNIDAD DE ENVASE', '', f'$ {costo_unidad:,.0f}'
        ), tags=('evenrow' if idx_final % 2 == 0 else 'oddrow',))
        idx_final += 1
        kg_envase = self.gramaje_envase_var.get() / 1000 or 0.001
        costo_kg = costo_unidad / kg_envase
        self.tree_costos.insert('', 'end', values=(
            'COSTO Kg PRODUCCION', '', f'$ {costo_kg:,.0f}'
        ), tags=('evenrow' if idx_final % 2 == 0 else 'oddrow',))
        idx_final += 1
        self.tree_costos.insert('', 'end', values=(
            'RENDIMIENTO', '', '0.90'
        ), tags=('evenrow' if idx_final % 2 == 0 else 'oddrow',))
        precio_costo = costo_unidad
        utilidad_valor = precio_costo * 0.30
        impuestos_valor = (precio_costo + utilidad_valor) * 0.19
        precio_venta_unitario = precio_costo + utilidad_valor + impuestos_valor
        precio_total_cantidad_total = cantidad_envases * precio_venta_unitario
        ganancia_por_producto = utilidad_valor
        ganancia_total = ganancia_por_producto * cantidad_envases
        pct_ganancia_producto = f"{ganancia_por_producto / precio_venta_unitario * 100:.2f}%" if precio_venta_unitario else ''
        pct_ganancia_total = f"{ganancia_total / (precio_venta_unitario * cantidad_envases) * 100:.2f}%" if precio_venta_unitario and cantidad_envases else ''
        conceptos_ganancia = [
            ('PRECIO COSTO', '', f'$ {precio_costo:,.0f}'),
            ('MARGEN UTILIDAD', '30%', f'$ {utilidad_valor:,.0f}'),
            ('IMPUESTOS', '19%', f'$ {impuestos_valor:,.0f}'),
            ('PRECIO TOTAL CANTIDAD TOTAL', '', f'$ {precio_total_cantidad_total:,.0f}'),
            ('PRECIO DE VENTA P.V.P UNITARIO', '', f'$ {precio_venta_unitario:,.0f}'),
            ('GANACIA POR PRODUCTO', pct_ganancia_producto, f'$ {ganancia_por_producto:,.0f}'),
            ('GANANCIA TOTAL', pct_ganancia_total, f'$ {ganancia_total:,.0f}')
        ]
        for idx, (concepto, valor2, valor3) in enumerate(conceptos_ganancia):
            tag = 'evenrow' if idx % 2 == 0 else 'oddrow'
            self.tree_izq.insert('', 'end', values=(concepto, valor2, valor3), tags=(tag,))

        # --------- OTROS PRECIOS VARIABLES ---------
        # Descuentos
        # Descuento editable dentro de la tabla
        if not hasattr(self, 'descuento_var'):
            self.descuento_var = tk.StringVar(value='10')
        def actualizar_descuento(*args):
            try:
                desc_str = self.descuento_var.get().strip()
                desc = float(desc_str) / 100 if desc_str else 0.0
                valor_desc = precio_venta_unitario * (1 - desc)
                # Promoción personalizada NxM
                if not hasattr(self, 'promo_var'):
                    self.promo_var = tk.StringVar(value='2x3')
                promo_str = self.promo_var.get().strip()
                promo_val = ''
                if 'x' in promo_str.lower():
                    try:
                        n, m = promo_str.lower().split('x')
                        n = int(n)
                        # Solo multiplicar el primer número por el precio unitario
                        promo_val = f'$ {precio_venta_unitario * n:,.0f}'
                    except Exception:
                        promo_val = ''
                self.tree_der.delete(*self.tree_der.get_children())
                # Descuento
                entry_val = '{ENTRY}' if desc > 0 else ''
                self.tree_der.insert('', 'end', values=(
                    'Precio con descuento',
                    entry_val,
                    f'$ {valor_desc:,.0f}'
                ), iid='descuento_row')
                # Promoción personalizada
                promo_entry_val = '{PROMO_ENTRY}'
                self.tree_der.insert('', 'end', values=(
                    'Promoción',
                    promo_entry_val,
                    promo_val
                ), iid='promo_row')
                # Precio mayorista editable
                if not hasattr(self, 'mayorista_var'):
                    self.mayorista_var = tk.StringVar(value='10')
                mayorista_str = self.mayorista_var.get().strip()
                mayorista_val = ''
                try:
                    mayorista_n = int(mayorista_str) if mayorista_str else 10
                    if mayorista_n < 10:
                        mayorista_val = 'Deben ser minimo 10 u'
                    else:
                        mayorista_val = f'$ {precio_venta_unitario * mayorista_n * 0.85:,.0f}'
                except Exception:
                    mayorista_val = ''
                self.tree_der.insert('', 'end', values=(
                    'Precio al por Mayor',
                    '{MAYORISTA_ENTRY}',
                    mayorista_val
                ), iid='mayorista_row')
                # Cliente especial
                if precio_venta_unitario > 0:
                    valor_especial = precio_venta_unitario * 0.80
                    self.tree_der.insert('', 'end', values=('Cliente especial', 'Precio especial con 20% de descuento', f'$ {valor_especial:,.0f}'))
            except Exception:
                pass
        self.descuento_var.trace_add('write', lambda *args: actualizar_descuento())
        if not hasattr(self, 'promo_var'):
            self.promo_var = tk.StringVar(value='2x3')
        self.promo_var.trace_add('write', lambda *args: actualizar_descuento())
        if not hasattr(self, 'mayorista_var'):
            self.mayorista_var = tk.StringVar(value='10')
        self.mayorista_var.trace_add('write', lambda *args: actualizar_descuento())
        actualizar_descuento()
        # Colocar Entry sobre la celda de la columna 2, fila 1 de la tabla (descuento)
        self.tree_der.update_idletasks()
        bbox = self.tree_der.bbox('descuento_row', 1)
        if bbox:
            x, y, width, height = bbox
            if hasattr(self, 'entry_descuento') and self.entry_descuento.winfo_exists():
                self.entry_descuento.place_forget()
            self.entry_descuento = tk.Entry(self.tree_der, textvariable=self.descuento_var, width=5, font=('Arial', 10))
            self.entry_descuento.place(x=x+2, y=y+2, width=width-4, height=height-4)
        # Colocar Entry sobre la celda de la columna 2, fila 2 de la tabla (promoción)
        bbox_promo = self.tree_der.bbox('promo_row', 1)
        if bbox_promo:
            x, y, width, height = bbox_promo
            if hasattr(self, 'entry_promo') and self.entry_promo.winfo_exists():
                self.entry_promo.place_forget()
            self.entry_promo = tk.Entry(self.tree_der, textvariable=self.promo_var, width=7, font=('Arial', 10))
            self.entry_promo.place(x=x+2, y=y+2, width=width-4, height=height-4)
        # Colocar Entry sobre la celda de la columna 2, fila 3 de la tabla (mayorista)
        bbox_mayorista = self.tree_der.bbox('mayorista_row', 1)
        if bbox_mayorista:
            x, y, width, height = bbox_mayorista
            if hasattr(self, 'entry_mayorista') and self.entry_mayorista.winfo_exists():
                self.entry_mayorista.place_forget()
            self.entry_mayorista = tk.Entry(self.tree_der, textvariable=self.mayorista_var, width=7, font=('Arial', 10))
            self.entry_mayorista.place(x=x+2, y=y+2, width=width-4, height=height-4)

if __name__ == '__main__':
    app = RecetarioApp()
    app.mainloop()
