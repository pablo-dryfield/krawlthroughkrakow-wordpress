<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>
	<div id="main-content" class="ktk-storefront-main">
		<div id="ktk-storefront-root">
			<noscript>
				<div class="ktk-storefront-noscript">
					JavaScript is required to browse these Krakow experiences.
				</div>
			</noscript>
		</div>
	</div>
	<?php wp_footer(); ?>
</body>
</html>
