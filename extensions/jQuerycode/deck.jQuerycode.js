(function( $, deck, window, undefined ) {
	var jsthrottle, htmlthrottle,
		$d = $(document);

	$[deck].addOptions({
		selectors: {
			jsSnippet: ".jquery",
			htmlSnippet: ".demo",
			cssSnippet: ".demo-css",
		}
	});

	$d.bind( [ deck ] + "init", function(){
		var $deck = $( $[deck].select ),
			opts = $deck[deck]( "getOptions" ),
			sels = opts.selectors;

		$.each({
			"js" : {
				sel: sels.jsSnippet,
				data: "jsSnippet",
				mode: "javascript"
			},
			"html" : {
				sel: sels.htmlSnippet,
				data: "htmlSnippet",
				mode: "text/html"
			},
			"css" : {
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
					}));
				if( key === "js" ) {
					// init preview on first go
					setTimeout( function() {
						$deck[deck]( "updatePreview", el );
					}, 500 );
				}
			});
		});
		
	});


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
		
		// build preview with jQuery
		preview.open();
		preview.write( prev );
	});

})(jQuery, 'deck', this);
