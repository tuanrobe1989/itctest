<?php
/*
Plugin Name: ITC Custom Plugin
Plugin URI: http://yourwebsite.com/
Description: This is a custom plugin for WordPress developed by ITC.
Version: 1.0
Author: Your Name
Author URI: http://yourwebsite.com/
*/


class Itc_Custom_Plugin
{
  public function __construct()
  {
    add_action('init', array($this, 'itc_custom_plugin_register_block'));
    add_action('init', array($this, 'enqueue_styles'));
  }

  function itc_custom_plugin_register_block()
  {
    wp_register_script(
      'itc-block-editor',
      plugins_url('build/index.js', __FILE__),
      array('wp-blocks', 'wp-element', 'wp-editor', 'wp-api-fetch'),
      filemtime(plugin_dir_path(__FILE__) . 'build/index.js')
    );

    register_block_type(
      'itc/itc-filter',
      array(
        'editor_script' => 'itc-block-editor',
        'script' => 'itc-block-editor',
        'render_callback' => array($this, 'itc_render_block')
      )
    );

    add_action('rest_api_init', function () {
      register_rest_route(
        'itc/v1',
        '/posts/',
        array (
          'methods' => 'GET',
          'callback' => array ($this, 'itc_fetch_posts'),
          'permission_callback' => '__return_true'
        )
      );
    });
  }

  function enqueue_styles()
  {
    wp_enqueue_style(
      'itc-block-style',
      plugins_url('build/style-index.css', __FILE__),
      array(),
      filemtime(plugin_dir_path(__FILE__) . 'build/style.css')
    );
  }


  function itc_render_block($attributes, $content)
  {
    return '<div id="itcFilterBlocks"></div>';
  }


  function itc_fetch_posts(WP_REST_Request $request)
  {

    $keyword = $request->get_param('keyword');
    $category = $request->get_param('category');
    $tags = explode(',', $request->get_param('tags'));
    $page = $request->get_param('page') ? $request->get_param('page') : 1; 

    $args = [
      'post_type' => 'post',
      'posts_per_page' => 5,
      'paged' => $page, 
      'post_status' => 'publish',
      's' => $keyword,
      'tax_query' => []
    ];
    

    if (!empty($category)) {
      $args['category_name'] = $category;
    }

    if (!empty($tags) && $tags[0] != '') {
      $args['tax_query'][] = [
        'taxonomy' => 'post_tag',
        'field' => 'slug',
        'terms' => $tags,
        'operator' => 'IN'
      ];
    }


    $query = new WP_Query($args);
    $posts_data = [];

    if ($query->have_posts()) {
      while ($query->have_posts()) {
        $query->the_post();
        $post_id = get_the_ID();

        $posts_data[] = [
          'id' => $post_id,
          'name' => get_the_title(),
          'description' => $this->word_count(get_the_excerpt(), 38),
          'thumbnail_url' => get_the_post_thumbnail_url($post_id, [150, 150])
        ];
      }
      wp_reset_postdata();
    }

    return new WP_REST_Response([
      'posts' => $posts_data,
      'maxPages' => $query->max_num_pages, // Total number of pages
      'currentPage' => $page
    ], 200);
  }

  function word_count($string, $limit)
  {

    $words = explode(' ', $string);

    return implode(' ', array_slice($words, 0, $limit)) . '...';

  }


}

new Itc_Custom_Plugin();




