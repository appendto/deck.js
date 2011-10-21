/*!
Deck JS - deck.core
Copyright (c) 2011 Caleb Troughton
Dual licensed under the MIT license and GPL license.
https://github.com/imakewebthings/deck.js/blob/master/MIT-license.txt
https://github.com/imakewebthings/deck.js/blob/master/GPL-license.txt
*/

/*
The deck.core module provides all the basic functionality for creating and
moving through a deck.  It does so by applying classes to indicate the state of
the deck and its slides, allowing CSS to take care of the visual representation
of each state.  It also provides methods for navigating the deck and inspecting
its state, as well as basic key bindings for going to the next and previous
slides.  More functionality is provided by wholly separate extension modules
that use the API provided by core.
*/
(function($, deck, document, undefined) {
	var $d = $(document);

	$.widget( [deck] + "." + [deck], { // add our own namespace, stay out of jQuery's
		options: {
			classes: {
				after: 'deck-after',
				before: 'deck-before',
				childCurrent: 'deck-child-current',
				current: 'deck-current',
				loading: 'deck-loading',
				next: 'deck-next',
				onPrefix: 'on-slide-',
				previous: 'deck-previous'
			},
			
			selectors: {
				container: '.deck-container',
				slide: '.slide'
			},
			
			keys: {
				// enter, space, page down, right arrow, down arrow,
				next: [13, 32, 34, 39, 40],
				// backspace, page up, left arrow, up arrow
				previous: [8, 33, 37, 38]
			},
			
			touch: {
				swipeTolerance: 60
			}
		},
		events: {
			/*
			This event fires whenever the current slide changes, whether by way of
			next, prev, or go. The callback function is passed two parameters, from
			and to, equal to the indices of the old slide and the new slide
			respectively.
			
			$(document).bind('deck.change', function(event, from, to) {
			   alert('Moving from slide ' + from + ' to ' + to);
			});
			*/
			change: 'change',
			
			/*
			This event fires at the end of deck initialization. Extensions should
			implement any code that relies on user extensible options (key bindings,
			element selectors, classes) within a handler for this event. Native
			events associated with Deck JS should be scoped under a .deck event
			namespace, as with the example below:
			
			var $d = $(document);
			$.deck.defaults.keys.myExtensionKeycode = 70; // 'h'
			$d.bind('deck.init', function() {
			   $d.bind('keydown.deck', function(event) {
				  if (event.which === $.deck.getOptions().keys.myExtensionKeycode) {
					 // Rock out
				  }
			   });
			});
			*/
			initialize: 'init'
		},
		_create: function() {
			var startTouch,
			$c,
			tolerance,
			options,
			slides,
			current,
			esp = function(e) {
				e.stopPropagation();
			},
			elements = this.options.selectors.slide,
			self = this;
			
			this.slides = []; // Array of all the uh, slides...
			this.current = 0; // Array index of the current slide

			// mapping local vars to widget data
			options = this.options;
			slides = this.slides;
			current = this.current;

			$c = this.element;
			tolerance = options.touch.swipeTolerance;
			
			// Hide the deck while states are being applied to kill transitions
			$c.addClass(options.classes.loading);
			
			// Fill slides array depending on parameter type
			if ($.isArray(elements)) {
				$.each(elements, function(i, e) {
					slides.push($(e));
				});
			}
			else {
				$(elements).each(function(i, e) {
					slides.push($(e));
				});
			}
			
			/* Remove any previous bindings, and rebind key events */
			$d.unbind('keydown.deck').bind('keydown.deck', function(e) {
				if (e.which === options.keys.next || $.inArray(e.which, options.keys.next) > -1) {
					self.next();
					e.preventDefault();
				}
				else if (e.which === options.keys.previous || $.inArray(e.which, options.keys.previous) > -1) {
					self.prev();
					e.preventDefault();
				}
			});
			
			/* Bind touch events for swiping between slides on touch devices */
			$c.unbind('touchstart.deck').bind('touchstart.deck', function(e) {
				if (!startTouch) {
					startTouch = $.extend({}, e.originalEvent.targetTouches[0]);
				}
			})
			.unbind('touchmove.deck').bind('touchmove.deck', function(e) {
				$.each(e.originalEvent.changedTouches, function(i, t) {
					if (startTouch && t.identifier === startTouch.identifier) {
						if (t.screenX - startTouch.screenX > tolerance || t.screenY - startTouch.screenY > tolerance) {
							self.prev();
							startTouch = undefined;
						}
						else if (t.screenX - startTouch.screenX < -1 * tolerance || t.screenY - startTouch.screenY < -1 * tolerance) {
							self.next();
							startTouch = undefined;
						}
						return false;
					}
				});
				e.preventDefault();
			})
			.unbind('touchend.deck').bind('touchend.deck', function(t) {
				$.each(t.originalEvent.changedTouches, function(i, t) {
					if (startTouch && t.identifier === startTouch.identifier) {
						startTouch = undefined;
					}
				});
			})
			.scrollLeft(0).scrollTop(0)
			/* Stop propagation of key events within editable elements of slides */
			.undelegate('input, textarea, select, button, meter, progress, [contentEditable]', 'keydown', esp)
			.delegate('input, textarea, select, button, meter, progress, [contentEditable]', 'keydown', esp);
			
			/*
			Kick iframes, which dont like to redraw w/ transforms.
			Remove this if Webkit ever fixes it.
			 */
			$.each(slides, function(i, $el) {
				$el.unbind('webkitTransitionEnd.deck').bind('webkitTransitionEnd.deck',
				function(event) {
					if ($el.hasClass(self.options.classes.current)){
						var embeds = $(this).find('iframe').css('opacity', 0);
						window.setTimeout(function() {
							embeds.css('opacity', 1);
						}, 100);
					}
				});
			});
			
			this._updateStates();
			
			// Show deck again now that slides are in place
			$c.removeClass(options.classes.loading);
			this._trigger(this.events.initialize);
		},
		/*
		Internal function. Updates slide and container classes based on which
		slide is the current slide.
		*/
		_updateStates : function() {
			var oc = this.options.classes,
				osc = this.element,
				$container = $(osc),
				old = $container.data('onSlide'),
				$all = $(),
				slides = this.slides,
				current = this.current;
			
			// Container state
			$container.removeClass(oc.onPrefix + old)
				.addClass(oc.onPrefix + current)
				.data('onSlide', current);
			
			// Remove and re-add child-current classes for nesting
			$('.' + oc.current).parentsUntil(osc).removeClass(oc.childCurrent);
			slides[current].parentsUntil(osc).addClass(oc.childCurrent);
			
			// Remove previous states
			$.each(slides, function(i, el) {
				$all = $all.add(el);
			});
			$all.removeClass([
				oc.before,
				oc.previous,
				oc.current,
				oc.next,
				oc.after
			].join(" "));
			
			// Add new states back in
			slides[current].addClass(oc.current);
			if (this.current > 0) {
				slides[current-1].addClass(oc.previous);
			}
			if (this.current + 1 < slides.length) {
				slides[current+1].addClass(oc.next);
			}
			if (this.current > 1) {
				$.each(slides.slice(0, current - 1), function(i, el) {
					el.addClass(oc.before);
				});
			}
			if (this.current + 2 < slides.length) {
				$.each(slides.slice(this.current+2), function(i, el) {
					el.addClass(oc.after);
				});
			}
		},
		// Moves to the slide at the specified index. Index is 0-based, so
		// $.deck('go', 0); will move to the first slide. If index is out of bounds
		// or not a number the call is ignored.
		//
		go: function(index) {
			if (typeof index != 'number' || index < 0 || index >= this.slides.length) return;
			
			this._trigger(this.events.change, {}, [this.current, index]);
			this._handleiFrame( this.current, index );
			this.current = index;
			this._updateStates();
		},
		
		//
		// $().deck('next')
		//
		// Moves to the next slide. If the last slide is already active, the call
		// is ignored.
		next: function() {
			this.go(this.current+1);
		},
		
		//
		// $().deck('prev')
		//
		// Moves to the previous slide. If the first slide is already active, the
		// call is ignored.
		prev: function() {
			this.go(this.current-1);
		},
		
		//
		// $().deck('getSlide', index)
		//
		// index: integer, optional
		//
		// Returns a jQuery object containing the slide at index. If index is not
		// specified, the current slide is returned.
		//
		getSlide: function(index) {
			var i = typeof index !== 'undefined' ? index : this.current;
			if (typeof i != 'number' || i < 0 || i >= this.slides.length) return null;
			return this.slides[i];
		},
		
		//
		// jQuery().deck('getSlides')
		//
		// Returns all slides as an array of jQuery objects.
		//
		getSlides: function() {
			return this.slides;
		},
		
		//
		// jQuery().deck('getContainer')
		//
		// Returns a jQuery object containing the deck container as defined by the
		// container option.
		//
		getContainer: function() {
			return $(this.element);
		},
		
		//
		// jQuery().deck('getOptions')
		//
		// Returns the options object for the deck, including any overrides that
		// were defined at initialization.
		//
		getOptions: function() {
			return this.options;
		},
		
		//
		// jQuery().deck('extend', name, method)
		//
		// name: string
		// method: function
		//
		// Adds method to the deck namespace with the key of name. This doesn’t
		// give access to any private member data — public methods must still be
		// used within method — but lets extension authors piggyback on the deck
		// namespace rather than pollute jQuery.
		// $.deck('extend', 'alert', function(msg) {
		//   alert(msg);
		// });

		// Alerts 'boom'
		// $.deck('alert', 'boom');
		//
		extend: function(name, method) {
			if( !this[name] ){
				this[name] = method;
			}
		},

		_handleiFrame: function( from, to) {
			/*
			FF + Transforms + Flash video don't get along...
			Firefox will reload and start playing certain videos after a
			transform.  Blanking the src when a previously shown slide goes out
			of view prevents this.
			*/
			var oldFrames = this.getSlide( from ).find('iframe'),
			newFrames = this.getSlide( to ).find('iframe');
			
			oldFrames.each(function() {
				var $this = $(this),
				curSrc = $this.attr('src');
				
				if(curSrc) {
					$this.data('deck-src', curSrc).attr('src', '');
				}
			});
			
			newFrames.each(function() {
				var $this = $(this),
				originalSrc = $this.data('deck-src');
				
				if (originalSrc) {
					$this.attr('src', originalSrc);
				}
			});
		}
	});

	/*
	The default settings object for a deck. All deck extensions should extend
	this object to add defaults for any of their options.
	
	options.classes.after
		This class is added to all slides that appear after the 'next' slide.
	
	options.classes.before
		This class is added to all slides that appear before the 'previous'
		slide.
		
	options.classes.childCurrent
		This class is added to all elements in the DOM tree between the
		'current' slide and the deck container. For standard slides, this is
		mostly seen and used for nested slides.
		
	options.classes.current
		This class is added to the current slide.
		
	options.classes.loading
		This class is applied to the deck container during loading phases and is
		primarily used as a way to short circuit transitions between states
		where such transitions are distracting or unwanted.  For example, this
		class is applied during deck initialization and then removed to prevent
		all the slides from appearing stacked and transitioning into place
		on load.
		
	options.classes.next
		This class is added to the slide immediately following the 'current'
		slide.
		
	options.classes.onPrefix
		This prefix, concatenated with the current slide index, is added to the
		deck container as you change slides.
		
	options.classes.previous
		This class is added to the slide immediately preceding the 'current'
		slide.
		
	options.selectors.container
		Elements matched by this CSS selector will be considered the deck
		container. The deck container is used to scope certain states of the
		deck, as with the onPrefix option, or with extensions such as deck.goto
		and deck.menu.
		
	options.keys.next
		The numeric keycode used to go to the next slide.
		
	options.keys.previous
		The numeric keycode used to go to the previous slide.
		
	options.touch.swipeTolerance
		The number of pixels the users finger must travel to produce a swipe
		gesture.
	*/
	//$[deck].defaults = {
	//};
	
	$[deck].addOptions = function( optHash ){
		$.extend( true, $[deck][deck].prototype.options, optHash );
	};

	// add a basic widget extension mechanism. doesnt' account for _superApply
	// as a base widget factory method would
	$[deck].extend = function( name, callback ) {
		if( !$[deck][deck].prototype[name] ) {
			$[deck][deck].prototype[name] = function() {
				callback.apply( this, arguments );
			};
		}
	};

	// build a helper for selecting all decks in the page.
	$[deck].select = ":" + deck + "-" + deck;

	$d.ready(function() {
		$('html').addClass('ready');
	});
})(jQuery, 'deck', document);
