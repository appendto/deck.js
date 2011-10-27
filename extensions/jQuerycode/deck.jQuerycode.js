(function( $, deck, window, undefined ) {
	var $d = $(document);

	$[deck].addOptions({
		selectors: {
			jsSnippet: ".jquery",
			htmlSnippet: ".demo",
			cssSnippet: ".demo-css",
		},
		jQueryCode: {
			collapsible: true
		}
	});

	$d.bind( [ deck ] + "init", function(){
		var $deck = $( $[deck].select ),
			opts = $deck[deck]( "getOptions" ),
			sels = opts.selectors,
			throttle = 0;

		$.each({
			"JavaScript" : {
				sel: sels.jsSnippet,
				data: "jsSnippet",
				mode: "javascript"
			},
			"HTML" : {
				sel: sels.htmlSnippet,
				data: "htmlSnippet",
				mode: "text/html"
			},
			"Css" : {
				sel: sels.cssSnippet,
				data: "cssSnippet",
				mode: "text/css"
			}
		}, function( key, val ) {
			$deck.find( val.sel ).each( function( i, el ) {
				$(el).data( val.data,
					CodeMirror.fromTextArea( el, {
						mode: val.mode,
						tabMode: "indent",
						onChange: function() {
							clearTimeout( throttle );
							throttle = setTimeout( $deck[deck]( "updatePreview", el), 2000 );
						}
					}))
					.next() // code mirror gives us no clean way to get at DOM element
					.addClass( val.data + "-codemirror" )
					.attr( "data-snippet", key );
			});
		});

		setTimeout( function() {
			initPreview( sels );
			if( opts.jQueryCode.collapsible ) {
				setupAccordion();
				initPreview( sels );
			}
		}, 500);
	});

	function setupAccordion() {
		var $d = $( $[deck].select );

		$d.find( ".slide" ).each( function( i, el ) {
			var $slide = $(el),
				$snippets = $slide.find( ".CodeMirror, iframe" );
			if( $snippets.length > 1 ) {
				var $accor = $( "<div class='collapsibles'></div>" );
				$snippets.each( function( i, snip ) {
					var $snip = $(snip);
					$accor
						.append( "<h3>" + ( $snip.attr( "data-snippet" ) || "Result" ) + "</h3>" )
						.append( snip );
				});
				$accor
					.delegate( "h3", "click", function( evt ) {
						$(this).next().slideToggle( 250 );
					})
					.appendTo( el );
			}
		});
	}

	function initPreview( sels ) {
		$( $[deck].select )
			.find( ".slide " + sels.jsSnippet )
			.each( function( i, el ) {
				$( $[deck].select )[deck]( "updatePreview", el );
			});
	}

	$[deck].extend( "updatePreview", function( el ) {
		var sels = this.options.selectors,
			$previewSlide = $(el).closest( sels.slide ),
			$previewIFrame = $previewSlide.find( "iframe" ),
			$previewjQ = $previewSlide.find( sels.jsSnippet ).data( "jsSnippet" ),
			$previewDemo = $previewSlide.find( sels.htmlSnippet ).data( "htmlSnippet" ),
			$previewCss = $previewSlide.find( sels.cssSnippet ).data( "cssSnippet" ),
			iframeHeight;

		// only build preview if both jq and demo snippet are in the slide
		if( !$previewjQ || !$previewDemo ) { return; }

		if( !$previewIFrame.length ) {
			// determine height based upon remaning slide space
			// this is expensive but is a one time cost at init
			iframeHeight = $previewSlide.innerHeight();
			$previewSlide.children().each( function( i, el ) {
				iframeHeight -= $(el).outerHeight();
			});
			$previewIFrame = $("<iframe></iframe>" )
				.height( iframeHeight > 250 ? iframeHeight : 250 )
				.appendTo( $previewSlide );
		}
		var preview = $previewIFrame[0].contentDocument || $previewIFrame[0].contentWindow.document;
		
		// load preview template with mustache
		var tmpl = $( "#jqDemoTemplate" ).val(),
			prev = $.mustache(tmpl, {
				demoScript : $previewjQ.getValue(),
				demoBody :  $previewDemo.getValue(),
				// css is optional, so check for existance
				demoCss : $previewCss ? $previewCss.getValue() : ""
			});
		
		preview.open();
		preview.write( prev );

	});

})(jQuery, 'deck', this);
