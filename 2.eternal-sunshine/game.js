/*
 * No Copyrights Infringement is intended. If anything was used that may have
 * copyrights, please let me know and I will remove it.
 *
 * This is a video game using P5.js to explore the playfulness of a gameplay.
 * It is based on the movie Eternal Sunhsine of the Spotless Mind.
 * There is a corelation with the movie characters and the game.
 * For more on this matter, read process.html.
 *
 * Concordia University
 * CART 351 : Networks & Navigation
 * Written by Vsevolod (Seva) Ivanov
 *
 * TODO:
 *      - Genetic Programming see: learn_evasion()
*/

var joel,
    clementine,
    frame,
    surface_bg,
    surface_w = 4000,
    surface_h = 3000;

// HTML
var surface_fg_div;

// Sprites images
var j_ne, j_nw, j_se, j_se,
    j_pole_images,
    c_ne, c_nw, c_se, c_se,
    c_pole_images;

var maps,
    current_map,
    falling_snow;

// used by noise for smooth clemantine evasion
var xoff = 0.0,
    evading_speedup = 3,
    dropping_speed_by = 0.005;

var music_bg,
    treatment_counter = 1

function preload()
{
    j_ne = loadImage("assets/images/joel/200/j-ne.png");
    j_nw = loadImage("assets/images/joel/200/j-nw.png");
    j_se = loadImage("assets/images/joel/200/j-se.png");
    j_sw = loadImage("assets/images/joel/200/j-sw.png");

    c_ne = loadImage("assets/images/clementine/200/c-ne.png");
    c_nw = loadImage("assets/images/clementine/200/c-nw.png");
    c_se = loadImage("assets/images/clementine/200/c-se.png");
    c_sw = loadImage("assets/images/clementine/200/c-sw.png");

    music_bg = loadSound("assets/sound/bookstore.mp3");
}

function setup()
{
    createCanvas(windowWidth, windowHeight);

    init_surface();
    init_characters();

    surface_fg_div = createDiv();
    surface_fg_div.id('surface-overlay');

    j_pole_images = {
        "NorthWest": j_nw,
        "NorthEast": j_ne,
        "SouthWest": j_sw,
        "SouthEast": j_se
    };
    c_pole_images = {
        "NorthWest": c_nw,
        "NorthEast": c_ne,
        "SouthWest": c_sw,
        "SouthEast": c_se
    };

    music_bg.setVolume(0.1); // fails
    music_bg.play();
}

function init_surface()
{
    surface_bg = new Group();

    maps = {
        beach_snow : {
            colors: {
                background: '#FFF8C6',
                particles: '#92E1FF'    // 7ECDFF
            }
        },
        frozen_lake : {
            colors: {
                background: '#F0FFFF',  // azure
                particles: '#56A5EC'    // iceberg
            }
        }
    }
    current_map = Object.keys(maps)[1];

    // Groud particles
    for(var i = 0; i < 400; i++)
    {
        var ground_particle = createSprite(
            random(-width, surface_w + width),
            random(-height, surface_h + height)
        );

        ground_particle.draw = function()
        {
            fill(maps[current_map].colors.particles);
            ellipse(0, 0, 10, 10);
        }

        surface_bg.add(ground_particle);
    }

    var snow_particles_template = {
        name: "snow_particles",
        colors: [maps[current_map].colors.particles],
        // fraction of screen width/height, centered at xy
        // [-a:a,-b:b] defines generation box, default [0,0]
        // note: it randomize well the snow source
        dxy: [2, 0],
        lifetime: Math.pow(10, 10),
        angle: [0, 180],
        size: [10, 20],
        speed: 5,
        speedx: 0.1,
        rate: [500, 1],
        x: 0.5,
        y: 0
    };
    falling_snow = new Fountain(null, snow_particles_template);

    // falling snow particles can go anywhere
    height = surface_h + height;
    width = surface_w + width;
}

function init_characters()
{
    // x, y, w, h
    joel = createSprite(200, 200, 50, 100);
    clementine = createSprite(500, 500, 50, 100);

    joel.addAnimation(
        "moving",
        "assets/images/j-nw-200.png"
    );

    clementine.addAnimation(
        "moving",
        "assets/images/c-nw-200.png"
    );

    joel.maxSpeed = 10;
    clementine.maxSpeed = 15;
}

function reset_game()
{
    treatment_counter++;
    learn_evasion();

    load_next_map();
    falling_snow.colors.fill(maps[current_map].colors.particles);

    joel.position.x = 200;
    joel.position.y = 200;

    clementine.position.y = random(500, surface_w - 100);
    clementine.position.y = random(500, surface_h - 100);
}

function draw()
{
    loop_music();

    // Initial background color
    background(maps[current_map].colors.background);

    // sprite, distance_from_walls
    limit_sprite_position(joel, 0);
    // will avoid corner catching technique
    limit_sprite_position(clementine, 150);

    handle_sprites_interactions(joel, clementine);

    // speed = 1/distance_mouse
    joel.velocity.x = (camera.mouseX-joel.position.x)/20;
    joel.velocity.y = (camera.mouseY-joel.position.y)/20;

    camera.zoom = 0.5;
    camera.position.x = joel.position.x;
    camera.position.y = joel.position.y;

    // TODO draw one on top of other depending on poles
    set_sprite_image_according_to_poles(joel, j_pole_images);
    set_sprite_image_according_to_poles(clementine, c_pole_images);

    drawSprites(surface_bg);
    drawSprite(joel);
    drawSprite(clementine);

    draw_falling_snow();
    falling_snow.location.x = joel.position.x;
    falling_snow.location.y = joel.position.y - height - 100;

    fadein_surface_fg();
    camera.off();

    // Top right corner text
    fill(0, 0, 0, 70);
    text('Memory treatment ' + treatment_counter, 10, 30);
    textSize(40);
}

function set_sprite_image_according_to_poles(sprite, images)
{
    var direction, animation_image;

    direction = ((sprite.velocity.y > 0) ? "South" : "North") +
                ((sprite.velocity.x > 0) ? "East" : "West");

    switch (direction)
    {
        case "NorthWest":
            animation_image = images['NorthWest'];
            break;
        case "NorthEast":
            animation_image = images['NorthEast'];
            break;
        case "SouthWest":
            animation_image = images['SouthWest'];
            break;
        case "SouthEast":
            animation_image = images['SouthEast'];
            break;
        default:
            break;
    }
    sprite.animation.images[0] = animation_image;
}

function learn_evasion()
{
    // Clementine can start by going faster on evasions
    randomSeed(treatment_counter / 10);

    // Clementine will could go faster on evasion
    evading_speedup += (treatment_counter / 2);

    // Clemetine will run away further by dropping speed slowly
    dropping_speed_by /= treatment_counter;
}

function handle_sprites_interactions(catching, evading)
{
    var distance_x = Math.abs(
        catching.position.x - evading.position.x
    );
    var distance_y = Math.abs(
        catching.position.y - evading.position.y
    );

    // Joel catched up Clementine
    if (distance_x < 50 && distance_y < 100)
    {
        reset_game();
        return;
    }
    // Clementine sees Joel
    else if(distance_x < 250 && distance_y < 250)
    {
        xoff += 0.01;
        var n = noise(xoff) * evading_speedup;

        evading.velocity.x = catching.velocity.x * n;
        evading.velocity.y = catching.velocity.y * n;
    }
    // Clementine starting lose sight of Joel
    else
    {
        // Dropping gradually velocity
        if (xoff > 0.00)
        {
            xoff -= dropping_speed_by;
            evading.velocity.x -= dropping_speed_by;
            evading.velocity.y -= dropping_speed_by;
        }
        // Clementine can't see Joel
        else
        {
            xoff = 0.00;
            evading.velocity.x = 0;
            evading.velocity.y = 0;
        }
    }
}

function limit_sprite_position(sprite, distance)
{
    if(sprite.position.x < distance)
    {
        sprite.position.x = distance;
    }
    if(sprite.position.x > surface_w - distance)
    {
        sprite.position.x = surface_w - distance;
    }

    if(sprite.position.y < distance)
    {
        sprite.position.y = distance;
    }
    if(sprite.position.y > surface_h - distance)
    {
        sprite.position.y = surface_h - distance;
    }
}

function load_next_map()
{
    var maps_array = Object.keys(maps);

    for (var i = 0; i < maps_array.length; i++)
    {
        var name = maps_array[i];

        if (!current_map)
        {
            update_map_colors(
                maps[name].colors.background,
                maps[name].colors.particles
            );
            current_map = name;
            break;
        }
        else if (name == current_map)
        {
            if (i == maps_array.length - 1)
            {
                // Set first map
                name = maps_array[0];
            }
            else
            {
                // Set next map
                name = maps_array[i + 1];
            }
            update_map_colors(
                 maps[name].colors.background,
                 maps[name].colors.particles
            );
            current_map = name;
            break;
        }
    }
}

function update_map_colors(bg_color, particles_color)
{
    background(bg_color);

    // Background particles
    for (var i = 0; i < surface_bg.length; i++)
    {
        surface_bg[i].draw = function()
        {
            fill(particles_color);
            ellipse(0, 0, 10, 10);
        };
    }
}

function draw_falling_snow()
{
    falling_snow.Draw();
    falling_snow.CreateN();
    falling_snow.Step();
    noStroke();
    text(
        falling_snow.length,
        width / 2,
        20
    );
    stroke(0);
}

var fadein_counter = 1.00;

function fadein_surface_fg()
{
    if (fadein_counter < 0.00)
    {
        return;
    }

    var precision = 0.01;

    surface_fg_div.style(
        'opacity',
        1.00 * fadein_counter
    );
    fadein_counter -= precision;
}

function loop_music()
{
    music_bg.setVolume(0.1); // forcing the setup

    if(music_bg.isPlaying() == false)
    {
        music_bg.play();
    }
}
