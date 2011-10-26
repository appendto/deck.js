(function( $, deck, window, undefined ) {
	var jsthrottle, htmlthrottle,
		$d = $(document);

	$[deck].addOptions({
		selectors: {
			jqCode: ".jquery",
			demoSnippet: ".demo"
		}
	});

	$d.bind( [ deck ] + "init", function(){
		var $deck = $( $[deck].select ),
			opts = $deck[deck]( "getOptions" ),
			sels = opts.selectors;

		$deck.find( sels.jqCode )
			.each( function( i, el ) {
				$(el).data( "jqCode",
					CodeMirror.fromTextArea( el, {
						mode: "javascript",
						tabMode: "indent",
						onChange: function() {
							clearTimeout( jsthrottle );
							jsthrottle = setTimeout( $deck[deck]( "updatePreview", el ), 2000);
						}
					}));

				// init preview for each jqCode section
				setTimeout( function() {
					$deck[deck]( "updatePreview", el ), 500
				});
			});
		$deck.find( sels.demoSnippet )
			.each( function( i, el ) {
				$(el).data( "htmlSnippet",
					CodeMirror.fromTextArea( el, {
						mode: "text/html",
						tabMode: "indent",
						onChange: function() {
							clearTimeout( htmlthrottle );
							htmlthrottle = setTimeout( $deck[deck]( "updatePreview", el ), 500);
						}
					}));
			});

	});


	$[deck].extend( "updatePreview", function( el ) {
		var sels = this.options.selectors,
			$previewSlide = $(el).closest( sels.slide ),
			$previewIFrame = $previewSlide.find( "iframe" ),
			$previewjQ = $previewSlide.find( sels.jqCode ).data( "jqCode" ),
			$previewDemo = $previewSlide.find( sels.demoSnippet ).data( "htmlSnippet" ),
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
				demoBody :  $previewDemo.getValue()
			});
		
		// build preview with jQuery
		preview.open();
		preview.write( prev );
	});

})(jQuery, 'deck', this);
