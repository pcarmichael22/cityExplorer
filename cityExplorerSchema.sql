DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7)
);

DROP TABLE IF EXISTS weather;

CREATE TABLE weather (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    forecast VARCHAR(255),
    time VARCHAR(255),
    created_at BIGINT
);

DROP TABLE IF EXISTS events;

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    link VARCHAR(255),
    name VARCHAR(255),
    event_date VARCHAR(255),
    summary VARCHAR
);

DROP TABLE IF EXISTS movies;

CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    title VARCHAR(255),
    overview VARCHAR,
    average_votes VARCHAR(255),
    total_votes VARCHAR(255),
    image_url VARCHAR(255),
    popularity VARCHAR(255),
    released_on VARCHAR(255)
);

-- CREATE TABLE locations (
--     id SERIAL PRIMARY KEY,
--     search_query VARCHAR(255),
--     formatted_query VARCHAR(255),
--     latitude NUMERIC(10,7),
--     longitude NUMERIC(10,7)
-- );

-- to test that things work

-- INSERT INTO locations 
-- (search_query, formatted_query, latitude, longitude)
-- VALUES
-- ('las vegas', 'LAS VEGASSSSS', 33.333333, 122.2222222)

