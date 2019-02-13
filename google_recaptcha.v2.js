/** @var {Array} captchaTargetActList */
/** @var {String} gCaptchaPending */


var googleReCaptchaUtil = {
	guid: function () {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}

		return s4() + s4() + s4() + s4() +
			s4() + s4() + s4() + s4();
	}
};

var googleReCaptcha = {
	ready: false,
	
	audioId: null,
	imageId: null,

	hookedDelegateArgs: null,
	$html             : null,
	$typeSelector     : null,

	$googleReCaptchaBody : null,
	$googleReCaptchaVoice: null,
	$googleReCaptchaImage: null,

	voiceRenderer: null,
	imageRenderer: null,

	bindAllForm: function () {
		$('form').each(function () {
			var $forms = $(this);

			$forms.each(function () {
				var $form = $(this);

				if ($form.hasOnSubmitAndOnProcFilter($form)) {
					if ($form.isRequrieSubmitHook($form)) {
						$form.submit(googleReCaptcha.submitEvent);
					}
				}
			});
		});
	},

	submitEvent: function (e) {
		e.preventDefault();

		alert('지원안함');
		return false;
	},

	isRequiredCaptcha: function (act) {
		return jQuery.inArray(act, captchaTargetActList) > -1;
	},

	exec_xml: function (module, act, params, delegate, responseTags, delegateArgs, formObject) {
		if(!googleReCaptcha.ready) {
			alert(gCaptchaPending);
			return false;
		}
		
		if (googleReCaptcha.isRequiredCaptcha(act)) {
			googleReCaptcha.hookedDelegateArgs = {
				'module'           : module,
				'act'              : act,
				'params'           : params,
				'callback_func'    : delegate,
				'response_tags'    : responseTags,
				'callback_func_arg': delegateArgs,
				'fo_obj'           : googleReCaptcha
			};

			params = {
				'google_recaptcha_action': 'getHtml',
				'mid'                    : current_mid
			};

			if (!googleReCaptcha.$html)
				window.oldExecXml(module, act, params, googleReCaptcha.onRecvHtml, ['view'], googleReCaptcha.hookedDelegateArgs, formObject);
			else
				googleReCaptcha.showCaptchaWindow(googleReCaptcha.hookedDelegateArgs);
		} else {
			window.oldExecXml(module, act, params, delegate, responseTags, googleReCaptcha.hookedDelegateArgs, formObject);
		}

		return true;
	},

	onRecvHtml: function (returnObject, responseTags, delegateArgs) {
		googleReCaptcha.$html = $(returnObject.view);			
		var $html             = googleReCaptcha.$html;

		$(document.body).append($html);

		$html.find('.google_recaptcha-close').click(function () {
			$html.fadeOut();
		});
		$html.find('.btn.image').click(googleReCaptcha.onClickImageType);
		$html.find('.btn.voice').click(googleReCaptcha.onClickVoiceType);

		googleReCaptcha.$typeSelector         = $html.find('.google_recaptcha-type');
		googleReCaptcha.$googleReCaptchaBody  = $html.find('.google_recaptcha');
		googleReCaptcha.$googleReCaptchaImage = $html.find('.google_recaptcha .image');
		googleReCaptcha.$googleReCaptchaVoice = $html.find('.google_recaptcha .voice');

		googleReCaptcha.audioId = "g" + googleReCaptchaUtil.guid();
		googleReCaptcha.imageId = "g" + googleReCaptchaUtil.guid();
		googleReCaptcha.$googleReCaptchaImage.attr('id', googleReCaptcha.imageId);
		googleReCaptcha.$googleReCaptchaVoice.attr('id', googleReCaptcha.audioId);

		googleReCaptcha.showCaptchaWindow(delegateArgs);
	},

	onClickImageType: function () {
		googleReCaptcha.drawGoogleReCaptcha(googleReCaptcha.imageId, 'image');

		googleReCaptcha.$typeSelector.fadeOut(function () {
			googleReCaptcha.$googleReCaptchaBody.show();
			googleReCaptcha.$googleReCaptchaImage.fadeIn();
		});
	},

	onClickVoiceType: function () {
		googleReCaptcha.drawGoogleReCaptcha(googleReCaptcha.audioId, 'audio');

		googleReCaptcha.$typeSelector.fadeOut(function () {
			googleReCaptcha.$googleReCaptchaBody.show();
			googleReCaptcha.$googleReCaptchaVoice.fadeIn();
		});
	},

	drawGoogleReCaptcha: function (id, type) {
		var key   = id + "Render";
		var idKey = type + "Id";

		googleReCaptcha.$googleReCaptchaImage.hide();
		googleReCaptcha.$googleReCaptchaVoice.hide();

		if (googleReCaptcha[key] != null)
			grecaptcha.reset(googleReCaptcha[key]);
		else
			googleReCaptcha[key] = grecaptcha.render(googleReCaptcha[idKey], {
				'sitekey' : gCaptchaSiteKey,
				'callback': googleReCaptcha.verifyCallback,
				'type'    : type
			});
	},

	showCaptchaWindow: function (delegateArgs) {
		googleReCaptcha.$googleReCaptchaBody.hide();
		googleReCaptcha.hookedDelegateArgs = delegateArgs;
		googleReCaptcha.$typeSelector.show();
		googleReCaptcha.$html.fadeIn();
	},

	verifyCallback: function (response) {
		var args = googleReCaptcha.hookedDelegateArgs;

		var params = {
			'google_recaptcha_action': 'compareCaptcha',
			'module'                 : args.module,
			'response'               : response
		};
		window.oldExecXml(args.act.module, args.act, params, googleReCaptcha.submit, [], args, args.fo_obj);
	},

	submit: function () {
		var args = googleReCaptcha.hookedDelegateArgs;

		googleReCaptcha.$html.hide();
		window.oldExecXml(args.module, args.act, args.params, args.callback_func, args.response_tags, args.callback_func_arg, args.fo_obj);

		googleReCaptcha.hookedDelegateArgs = null;
	}
};


if (typeof(jQuery) == "undefined") {
	alert('Error: This document does not include jQuery.');
}

function onLoadGoogleReCaptcha() {
	
	googleReCaptcha.bindAllForm();	
	googleReCaptcha.ready = true;
}

jQuery(function ($) {	
	jQuery.fn.extend({
		hasOnSubmitAndOnProcFilter: function () {
			if (this.length > 1)
				throw "Only one element can be selected.";

			var $f = $(this);

			return !$f.attr('onsubmit') || $f.attr('onsubmit').indexOf('procFilter') < 0;
		},

		isRequrieSubmitHook: function () {
			if (this.length > 1)
				throw "Only one element can be selected.";

			var $f = $(this);

			var act      = $f.find('input[name=act]').val();
			var onsubmit = $f.attr('onsubmit');

			for (var k in captchaTargetActList) {
				var captchaTargetAct = captchaTargetActList[k];

				if ((!onsubmit || onsubmit.indexOf(captchaTargetAct) < 0) && act.length > 0) {
					return captchaTargetAct == act;
				}
			}

			return false;
		}
	});

	captchaTargetActList.push("IS");
	
	if (!window.oldExecXml) {
		window.oldExecXml = window.exec_xml;
		window.exec_xml   = googleReCaptcha.exec_xml;
	}
});