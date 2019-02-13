<?php
/**
 * User: Kyeongdae
 * Date: 2017-08-23
 * Time: 오전 7:22
 */
ini_set('display_errors', 1);
ini_set('error_reporting', E_ALL & ~E_DEPRECATED & ~E_STRICT & ~E_NOTICE);
 
const ADDON_GOOGLE_RE_CAPTCHA = '__AddonGoogleReCaptcha__';

if (!defined("__XE__")) exit();
/** @var string $called_position */

$cacheDir = _XE_PATH_ . 'files/cache/addons/google_recaptcha/';
if (!file_exists($cacheDir)) {
	mkdir($cacheDir);
}

if (!function_exists('context')) {
	define('GoogleReCaptcha_context', 1);

	/** @return Context */
	function context() {
		return Context::getInstance();
	}
} elseif (!defined('GoogleReCaptcha_context')) {
	throw new RuntimeException('context function is already defined.');
}

if (!class_exists('GoogleReCaptcha', false)) {
	// On the mobile mode, XE Core does not load jquery and xe.js as normal.
	if (Mobile::isFromMobilePhone()) {
		context()->loadFile(array('./common/js/jquery.min.js', 'head', null, -100000));
		context()->loadFile(array('./common/js/xe.min.js', 'head', null, -100000));
	}

	require_once 'GoogleReCaptcha.php';

	$GLOBALS[ADDON_GOOGLE_RE_CAPTCHA] = new GoogleReCaptcha();
	$GLOBALS[ADDON_GOOGLE_RE_CAPTCHA]->setInfo($addon_info);
	$GLOBALS[ADDON_GOOGLE_RE_CAPTCHA]->setPath(_XE_PATH_.'addons/google_recaptcha');
	context()->set('oCaptcha', $GLOBALS[ADDON_GOOGLE_RE_CAPTCHA]);
}
/** @var GoogleReCaptcha $addon */
$addon = $GLOBALS[ADDON_GOOGLE_RE_CAPTCHA];

$addon_act_postfix  = context()->get('google_recaptcha_action');
$invoke_method_name = $called_position . '_' . $addon_act_postfix;


if(method_exists($addon, $called_position))
{
	if(!call_user_func_array(array(&$addon, $called_position), array(&$this)))
	{
		return false;
	}
}

$addon_act = Context::get('google_recaptcha_action');
if($addon_act && method_exists($addon, $called_position . '_' . $addon_act))
{
	if(!call_user_func_array(array(&$addon, $called_position . '_' . $addon_act), array(&$this)))
	{
		return false;
	}
}