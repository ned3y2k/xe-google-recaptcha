<?php
/**
 * User: Kyeongdae
 * Date: 2017-08-23
 * Time: 오전 8:17
 */

class GoogleReCaptcha {
	const CAPTCHA_AUTHED = 'google_captcha_authed';
	const CAPTCHA_JS              = './addons/google_recaptcha/google_recaptcha.js';

	private $addon_info;
	private $addon_path;
	private $test;

	private $target_acts = [];
	private $html;

	/** @return Context */
	function context() { return Context::getInstance(); }

	public function setPath($addon_path) { $this->addon_path = $addon_path; }

	private function loadLang() {
		$this->context()->loadLang($this->addon_path . '/lang');
	}

	function loadHtml() {
		$this->loadLang();

		if (!$this->html)
			$this->html = TemplateHandler::getInstance()->compile($this->addon_path . '/skin', 'view');

		return $this->html;
	}

	/**
	 * @param string $addon_info XE의 애드온들은 각각 독자적인 설정과 애드온이 동작하기를 원하는 대상 모듈을 지정할 수 있습니다.<br>
	 *                           이 정보들이 $addon_info 변수를 통해서 전달됩니다.
	 */
	function setInfo($addon_info) {
		$this->addon_info = $addon_info;
		$this->test       = $this->addon_info->test == 'Y';
	}

	/**
	 * 모듈 객체 생성 이전 : 사용자의 요청으로 필요한 모듈을 찾은후 모듈의 객체를 생성하기 이전을 의미합니다.
	 *
	 * @param ModuleHandler $moduleHandler
	 *
	 * @return bool
	 */
	function before_module_init(ModuleHandler $moduleHandler) {
		/** @var stdClass $logged_info */
		$logged_info = $this->context()->get('logged_info');
		if ($logged_info->is_admin == 'Y' || $logged_info->is_site_admin) {
			return false;
		}

		if ($_SESSION['XE_VALIDATOR_ERROR'] == -1) {
			$_SESSION[self::CAPTCHA_AUTHED] = false;
		}
		if ($_SESSION[self::CAPTCHA_AUTHED]) {
			return false;
		}

		$this->target_acts = array('procBoardInsertDocument', 'procBoardInsertComment', 'procIssuetrackerInsertIssue', 'procIssuetrackerInsertHistory', 'procTextyleInsertComment');

		if ($this->context()->getRequestMethod() != 'XMLRPC' && $this->context()->getRequestMethod() !== 'JSON') {
			$this->context()->addHtmlHeader('<script>var captchaTargetActList	 = ' . json_encode($this->target_acts) . '; var gCaptchaSiteKey = "' . $this->addon_info->siteKey . '";</script>');
			$this->context()->addHtmlHeader("<script src='https://www.google.com/recaptcha/api.js?onload=onLoadGoogleReCaptcha&render=explicit' async defer></script>");
			$this->context()->loadFile(array(self::CAPTCHA_JS));
		}

		// compare session when calling actions such as writing a post or a comment on the board/issue tracker module
		if (!$_SESSION[self::CAPTCHA_AUTHED] && in_array($this->context()->get('act'), $this->target_acts)) {
			$this->loadLang();
			$moduleHandler->error = "captcha_denied";
		}

		return true;
	}

	/**
	 * 모듈 실행 이전 : 모듈의 객체를 실행하고 모듈의 실행을 하기 이전을 의미합니다.
	 *
	 * @param ModuleObject $moduleObject
	 */
	function before_module_proc(ModuleObject $moduleObject) {
		if ($this->addon_info->act_type == 'everytime' && $_SESSION[self::CAPTCHA_AUTHED]) {
			unset($_SESSION[self::CAPTCHA_AUTHED]);
		}
	}

	/**
	 * 모듈의 동작 이후 : 생성된 모듈 객체를 실행하고 결과를 얻은 바로 후를 의미합니다.
	 *
	 * @param ModuleObject $moduleObject
	 */
	function after_module_proc(ModuleObject $moduleObject) { }

	function before_module_init_getHtml() {
		if ($_SESSION[self::CAPTCHA_AUTHED]) {
			return false;
		}

		$this->loadLang();

		header("Content-Type: text/xml; charset=UTF-8");
		header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
		header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
		header("Cache-Control: no-store, no-cache, must-revalidate");
		header("Cache-Control: post-check=0, pre-check=0", false);
		header("Pragma: no-cache");

		printf(file_get_contents($this->addon_path . '/tpl/response.view.xml'), $this->loadHtml());

		$this->context()->close();
		exit();
	}

	function compareCaptcha() {
//		var_dump(in_array($this->context()->get('act'), $this->target_acts), $this->target_acts, $this->context()->get('act'));exit;
		if (!in_array($this->context()->get('act'), $this->target_acts)) {
			return true;
		}

		if ($_SESSION[self::CAPTCHA_AUTHED]) {
			return true;
		}

		if ($this->getResponse()) {
			$_SESSION[self::CAPTCHA_AUTHED] = true;
			return true;
		}

		unset($_SESSION[self::CAPTCHA_AUTHED]);

		return false;
	}

	function before_module_init_compareCaptcha() {
		try {
			header("Content-Type: text/xml; charset=UTF-8");
			header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
			header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
			header("Cache-Control: no-store, no-cache, must-revalidate");
			header("Cache-Control: post-check=0, pre-check=0", false);
			header("Pragma: no-cache");

			$this->compareCaptcha();

			print("<response>\n<error>0</error>\n<message>success</message>\n</response>");

			$this->context()->close();
			exit();
		} catch (Exception $ex) {
			print("<response>\n<error>-1</error>\n<message>{$ex->getMessage()}</message>\n</response>");

			return false;
		}

	}

	/**
	 * @throws RuntimeException
	 * @return boolean
	 */
	private function getResponse() {
		$post_data = http_build_query(
			array(
				'secret'   => $this->addon_info->secretKey,
				'response' => $this->context()->get('response'),
				'remoteip' => $_SERVER['REMOTE_ADDR']
			)
		);

		$ch = curl_init();

		curl_setopt($ch, CURLOPT_URL,'https://www.google.com/recaptcha/api/siteverify');
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($ch, CURLOPT_POST, 1);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$response = curl_exec ($ch);
		curl_close ($ch);
		$result    = (array)json_decode($response);


		if (!$result['success']) {
			throw new RuntimeException($result["error-codes"][0]);
		}

		return true;
	}
}