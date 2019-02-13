/** @var {Array} captchaTargetActList */
/** @var {String} gCaptchaPending */

grecaptcha.ready(function () {
    grecaptcha.execute(gCaptchaSiteKey, {action: 'homepage'}).then(function (token) {
        googleReCaptchaV3.verify(token);
    });
});

var googleReCaptchaV3 = {
    ready: false,

    hookedDelegateArgs: null,
    $html: null,
    $typeSelector: null,

    bindAllForm: function () {
        $('form').each(function () {
            var $forms = $(this);

            $forms.each(function () {
                var $form = $(this);

                if ($form.hasOnSubmitAndOnProcFilter($form)) {
                    if ($form.isRequrieSubmitHook($form)) {
                        $form.submit(googleReCaptchaV3.submitEvent);
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


    exec_xml: function (module, act, params, delegate, responseTags, delegateArgs, formObject) {
        if (!googleReCaptchaV3.ready) {
            alert(gCaptchaPending);
            return false;
        }

        params.google_response = googleReCaptchaV3.token;
        window.oldExecXml(module, act, params, delegate, responseTags, delegateArgs, formObject);

        return true;
    },

    verify: function (token) {
        googleReCaptchaV3.bindAllForm();
        googleReCaptchaV3.ready = true;
        googleReCaptchaV3.token = token;
    },

    submit: function () {
        var args = googleReCaptchaV3.hookedDelegateArgs;

        window.oldExecXml(args.module, args.act, args.params, args.callback_func, args.response_tags, args.callback_func_arg, args.fo_obj);

        googleReCaptchaV3.hookedDelegateArgs = null;
    }
};


if (typeof (jQuery) == "undefined") {
    alert('Error: This document does not include jQuery.');
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

            var act = $f.find('input[name=act]').val();
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
        window.exec_xml = googleReCaptchaV3.exec_xml;
    }
});