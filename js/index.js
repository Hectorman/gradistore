;( function( window ) {

    // Búsqueda de elementos en el DOM jQuery style
    function $( elString ) {

        const nodes = document.querySelectorAll( elString );

        return nodes.length > 1 ? nodes : nodes[0];

    }

    // Definición de la clase constructora
    let GradiStore = function GradiStore($el) {
        // Initialization
        this.$el = $($el);
        this.carrito = [];
        this.products = [];
        this.ordenActiva = false;
        this.init();
    } 
 
    // Métodos de la instancia
    GradiStore.prototype = {
 
        init: function () {

            let self = this;

            // inicializamos el render de los productos
            this.fetchProducts( function() {

                // inicializamos el carrusel
                self.mountSplide();

            } );

            this.declararEventos();

        },

        fetchProducts: function( callback ) {

            let self = this;

            // hacemos el fetch a los productos
            fetch("https://gradistore-spi.herokuapp.com/products/all")
                .then((response) => response.json())
                .then((data) => {

                    self.products = data.products.nodes;

                    // insertamos el html del carrusel de productos
                    self.renderProductsHTML( function(){

                        // llamamos el callback
                        if ( callback ) callback();
                    } );

                });

        },

        renderProductsHTML: function( callback ) {

            const self = this;

            console.log(this.products);

            // plantilla base 
            const $product_template = $('.product-template'),
                  // contenedor de los slides
                  $splide_list = $('.splide__list');
            
            // contador de la imagen
            let imgCounter = 2;

            // recorremos la lista de productos
            for (const product of this.products) {
                
                //clonamos la plantilla base
                const $product_node = $product_template.cloneNode( true );

                // removemos la clase de la plantilla
                $product_node.classList.remove("product-template");

                // si el contador de imagen llega a 6 lo devolvemos a 0
                if ( imgCounter > 5 ) { imgCounter = 0 };

                imgCounter++;

                const imgUrl = 'img/product-' + imgCounter + '.jpg';

                product.thumb = imgUrl;

                // modificamos la url de la imagen
                $product_node.querySelectorAll('.thumb img')[0].src = product.thumb;

                // modificamos el título
                $product_node.querySelectorAll('h2')[0].textContent = product.title;

                // modificamos las estrellas y el rating
                this.setProductRating( $product_node, product.tags );

                // evento click agregar al carrito
                const $add_to_cart = $product_node.querySelectorAll('.thumb a')[0];

                const id_producto = product.id.replace(/^\D+/g, '');
                
                $add_to_cart.dataset.id_producto = id_producto;

                // insertamos el producto en el carrusel
                $splide_list.appendChild( $product_node );

            }

            // removemos la plantilla base
            $product_template.remove();

            // llamamos el callback
            if ( callback ) callback();

        },

        setProductRating: function( $product_node, tags ) {

            // filtramos el array de tags para tomar sólo números
            const numberTags = tags.filter(tag => /^\d+$/.test(tag));
            let rating = 0;

            // si obtenemos más de un elemento númerico calculamos el promedio
            if ( numberTags.length > 1 ) {

                for(i=0; i < numberTags.length; i++) {

                    rating += numberTags[i] * 1;

                }

                rating = rating / numberTags.length;

            // si es un único resultado lo asignamos como rating    
            } else {

                rating = numberTags[0] * 1;

            }

            // imprimimos el rating
            $product_node.querySelectorAll('.stars span')[0].innerHTML = '('+ rating +')';

            // sacamos el valor númerico de estrellas redondeando el rating por debajo
            let stars = Math.floor( rating / 100 );
            
            // obtenemos los nodos de las estrellas
            const stars_colection = $product_node.querySelectorAll('.stars i');

            // recorremos los nodos de estrellas y ajustamos clases según rating
            for (let i = 0; i < stars_colection.length; i++) {
                
                if ( i > stars ) {

                    stars_colection[i].classList.remove('icon-star');

                    stars_colection[i].classList.add('icon-star_outline');

                }

            }

        },

        addToCart: function( e ) {

            const $body = $('body');

            // aplicamos las clases para mostrar el popup

            $('.agregado').style.display = 'block';

            $body.classList.add('showPopup','no-trans');

            setTimeout(function(){

                $body.classList.remove('cart-only');

            },20);

            setTimeout(function(){

                $body.classList.remove('no-trans');

            },400);

            // buscamos el producto en el carrito
            let existingOrden = this.getOrdenByID( e.target.dataset.id_producto );

            // si ya existe actualizamos las cantidad
            if ( existingOrden ) {

                existingOrden.cantidad++;

                this.ordenActiva = existingOrden;

            // si no existe agregamos una nueva orden    
            } else {

                let nuevaOrden = {
                    id_producto : e.target.dataset.id_producto,
                    cantidad: 1
                }
    
                this.carrito.push( nuevaOrden );
    
                this.ordenActiva = nuevaOrden;

            }

            // actualizamos la vista
            this.actualizarPopup();

            this.actualizarCarrito();

            this.setOrdenActive();

        },

        seleccionarOrden: function( id_producto ) {

            // ocultamos el mensaje de producto agregado
            $('.agregado').style.display = 'none';

            // actualizamos orden activa
            this.ordenActiva = this.getOrdenByID( id_producto );

            // actualizamos las vistas
            this.actualizarPopup();

            this.setOrdenActive();

        },

        // actualiza el estado activo de las ordenes del carrito
        setOrdenActive: function( ) {

            const index = this.carrito.indexOf( this.ordenActiva );

            setTimeout(function(){

                $cart_items = document.querySelectorAll('.carlist > div');

                for (let i = 0; i < $cart_items.length; i++) {

                    if ( i == index ) {

                        $cart_items[i].classList.add('active');

                    } else {

                        $cart_items[i].classList.remove('active');

                    }

                }

            }, 20);

            $('body').classList.remove('cart-only');

        },

        actualizarPopup: function() {

            // obtenemos el producto activo
            const productoActivo = this.getProductByID( this.ordenActiva.id_producto );

            // actualizamos el título
            $('.active-orden h3').textContent = productoActivo.title;

            // actualizamos la imagen
            $('.active-orden .thumb img').src = productoActivo.thumb;

            // cantidad
            $('.active-orden .cantidad').textContent = this.ordenActiva.cantidad;

            // subtotal
            $('.active-orden .total-orden').textContent = this.ordenActiva.cantidad * 15;

        },

        actualizarCarrito: function() {

            let $carrito = $('.carlist'),
                cart_total = 0,
                total_items = 0;

            $carrito.innerHTML = '';

            // recorremos las ordenes del carrito
            for (const orden of this.carrito) {

                // construimos el html para mostrar las ordenes
                const $cart_item = document.createElement("div"),
                      $orden_info =  document.createElement("div"),
                      $title = document.createElement("h5"),
                      $subtitle =  document.createElement("div"),
                      $borrar = document.createElement('i'),
                      product = this.getProductByID( orden.id_producto );

                // agregamos las clases y atributos
                $cart_item.classList.add('cart-item');
                $subtitle.classList.add('subtitle');
                $borrar.classList.add('icon-trash-2');
                $borrar.title = "borrar";

                // imprimimos el título del producto
                $title.textContent = product.title;

                // imprimimos el id del producto en el div como data
                $cart_item.dataset.id_producto = orden.id_producto;

                // insertamos todos los nodos en el documento
                $cart_item.appendChild( $orden_info );
                $cart_item.appendChild( $borrar );
                $orden_info.appendChild( $title );
                $subtitle.innerHTML = '<p>x '+ orden.cantidad + '</p>' + '<p>subtotal: € '+ orden.cantidad * 15 +'</p>';
                $orden_info.appendChild( $subtitle );
                $carrito.appendChild( $cart_item );

                cart_total += orden.cantidad * 15;
                total_items += orden.cantidad * 1;

                // bind evento click en la orden del carrito
                $title.addEventListener("click", (event) => {

                    this.seleccionarOrden( event.target.parentNode.parentNode.dataset.id_producto );
    
                    event.preventDefault();
    
                });

                // bind evento borrar orden
                $borrar.addEventListener("click", (event) => {

                    this.borrarOrden( event );
    
                });

            }

            // actualizamos el total del carrito
            const $cart_total = $('.cart-total span');
            $cart_total.textContent = cart_total;

            // actualizamos el contador de productos del ícono
            $('.carrito-icon .contador').textContent = total_items;

        },

        // borra una orden del carrito
        borrarOrden: function( event ) {

            const $parent = event.target.parentNode,
                  id_producto = $parent.dataset.id_producto,
                  orden = this.getOrdenByID( id_producto ),
                  index = this.carrito.indexOf( orden );

            this.carrito.splice( index, 1 );

            this.actualizarCarrito();

            this.setOrdenActive();

            if ( $parent.classList.contains('active') ) {
            
                $('body').classList.add('cart-only');

            } 

            if ( !this.carrito.length ) this.closePopup();

        },

        // abre el popup del carrito
        openCart: function() {

            if ( !this.carrito.length ) return

            $('.agregado').style.display = 'none';

            if ( $('.carlist > div.active') ) $('.carlist > div.active').classList.remove('active');

            $('body').classList.add('showPopup', 'no-trans');

            setTimeout(function(){

                $('body').classList.add('cart-only');

            },20);

            setTimeout(function(){

                $('body').classList.remove('no-trans');

            },400);

        },

        // cierra el popup del carrito
        closePopup: function() {

            $('body').classList.remove('showPopup');

        },

        // obtener un producto de la lista con el id
        getProductByID: function( id_producto ) {

            for (const product of this.products) {

                const id_producto_str = product.id.replace(/^\D+/g, '');

                if ( id_producto == id_producto_str ) {

                    return product

                }

            }

            return false

        },

        // obtener una orden del carrito con el id
        getOrdenByID: function( id_producto ) {

            for (const orden of this.carrito) {

                if ( id_producto == orden.id_producto ) {

                    return orden

                }

            }

            return false

        },

        // cerrar el popup al dar click por fuera del mismo
        backClick: function(e) {

            if ( e.target.classList.contains('popup') ) this.closePopup();

        },

        // bind eventos general
        declararEventos: function () {

            const self = this;

            // click ícono cerrar popup
            $('.close-popup').addEventListener("click", (event) => {

                self.closePopup();

                event.preventDefault();

            });

            // click por fuera del popup
            $('.popup').addEventListener("click", (event) => {

                self.backClick( event );

            });

            // click ícono carrito - abrir carrito
            $('.carrito-icon').addEventListener("click", (event) => {

                self.openCart();

                event.preventDefault();

            });

            // submit formulario de newsletter
            $('.newsletter-form').addEventListener("submit", (event) => {

                alert('Formulario enviado correctamente');

                $('.newsletter-form').reset();

                event.preventDefault();

            });

            // click botón agregar al carrito
            document.addEventListener("click", (event) => {

                if ( event.target.classList.contains('add-to-cart') ) {

                    self.addToCart( event );

                    event.preventDefault();

                }

            });

        },

        mountSplide: function () {

            // nueva instancia de splide
            var splide = new Splide( '.splide', {
                type       : 'loop',
                focus      : 'center',
                fixedWidth : '320px',
                pagination : false,
                arrows     : false,
                gap        : '15px',
                breakpoints: {
                    600: {
                        fixedWidth : '247px',
                        focus: 0
                    }
                },
            } );

            splide.on( 'mounted', function () {
                
                $('body').classList.add('page-loaded');

            } );
        
            splide.mount();

            // evento click flecha siguiente
            $('.arrow-right').addEventListener("click", (event) => {

                splide.go( '>' );

            });

            // evento click flecha anterior
            $('.arrow-left').addEventListener("click", (event) => {

                splide.go( '<' );

            });

        }

    }

    // Inicializamos una nueva isntancia de la app
    new GradiStore( '#app' )

} )( window );