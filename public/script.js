/* JS functions for Event-ify
*/

class Users {
    constructor(name, id, access_token, refresh_token) {
        this.name = name;
        this.id = id;
        this.access_token = access_token;
        this.refresh_token = refresh_token;
        this.top_tracks = [];
        this.setTopTracks();
    }

    /**
     * Gets users top tracks
     * @param {string} access_token - Users access token
     * @param {string} type - the type of top info ("tracks" | "artists")
     * @param {number} limit - the number objects to be returned (1-50)
     * @param {number} offset - the value to start at (1-50)
     * @param {string} time_range - the range of time to grab top info from ("short_term" | "medium_term" | "long_term")
     * @return {JSON Object} - JSON response Object
     */
    async getTopTracks(access_token, type='tracks', limit=50, offset=0, time_range="short_term") {
        let options = {
            method: 'GET',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': ` Bearer ${access_token}`
            }
        }
        let fetch_top_tracks = await fetch(`https://api.spotify.com/v1/me/top/${type}?limit=${limit}&offset=${offset}&time_range=${time_range}`, options)
        .then(res => res.json())
        .then(res => res.items);
        return fetch_top_tracks;
    }

    setName(name) {
        this.name = name;
    }

    setAccessToken(token) {
        this.access_token = token;
    }

    setRefreshToken(token) {
        this.refresh_token = token;
    }

    async setTopTracks(type='tracks', limit=50, offset=0, time_range="short_term") {
        await this.getTopTracks(this.access_token, type, limit, offset, time_range).then(response => this.top_tracks = response)
    }
}

let params = getHashParams();

let access_token = params.access_token,
    refresh_token = params.refresh_token,
    error = params.error;
    

/**
 * Gets users top tracks
 * @param {string} access_token - Users access token
 * @param {string} type - the type of top info ("tracks" | "artists")
 * @param {number} limit - the number objects to be returned (1-50)
 * @param {number} offset - the value to start at (1-50)
 * @param {string} time_range - the range of time to grab top info from ("short_term" | "medium_term" | "long_term")
 * @return {JSON Object} - JSON response Object
 */
async function getTopTracks(access_token, type='tracks', limit=50, offset=0, time_range="short_term") {
    let options = {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': ` Bearer ${access_token}`
        }
    }
    let fetchTopTracks = fetch(`https://api.spotify.com/v1/me/top/${type}?limit=${limit}&offset=${offset}&time_range=${time_range}`, options);
    fetchTopTracks.then(res =>
        res.json()).then(d => {
            console.log(d);
            return d;
    })
    return fetchTopTracks;
}

async function createPlayList()
{
    let users_songs = [ Owner ]; //Just Owner for debugging
    let length_ms = 40*60*1000; //40 Minutes for debugging
    const song_list = createSongList(users_songs, length_ms);

    let playlist_id = await createSpotifyPlaylist("Test Playlist", "This is a test playlist", Owner.access_token, Owner.id)
    await addMusicToPlaylist(playlist_id, song_list);
}

/**
 * Gets users top tracks
 * @param {JSON Object} users_tracks - Users and their list of top songs
 * @param {int} length_ms - max length for the playlist in milliseconds
 * @return {String Array} - Array of song IDs
 */
function createSongList(users_tracks, length_ms) {
    let multi = [];
    let single = [];

    //Obj Song: {"ID","rating","count","length_ms"}

    // Iterate through each song for each person
    users_tracks.forEach(user => {
        let index = 0;
        user.top_tracks.forEach(song => {

            // Check multi list
            let multi_song = multi.find(s => s.ID === song.uri);
            if (multi_song !== undefined)
            {
                multi_song.count++;
            }
            // Check single list
            else
            {
                let single_song = single.find(s => s.ID === song.uri);
                if (single_song !== undefined)
                {
                    // Move song to multi list
                    single = single.filter(s => s !== single_song);
                    single_song.count++;
                    single_song.rating += index;
                    multi.push(single_song);
                }
                else
                {
                    // Add new song
                    let newSong = { ID: song.uri, rating: index, count: 1, length_ms: song.duration_ms };
                    single.push(newSong);
                }
            }

            index++;
        });
    });

    // Create playlist array based on rating and count
    // * The length of the playlist must also be tracked so it does not grow to large
    let playlist = [];
    let play_length_ms = 0;
    
    // Implement mutli values for song rankings
    multi_values = multi.map(s => {
        return {
            ID: s.ID,
            value: s.rating / s.count
        };
    });
    
    // Sorts songs for rankings
    multi_values.sort((a, b) => a.value - b.value);
    single.sort((a, b) => a.rating - b.rating);

    // Add songs to playlist

    multi_values.forEach(s => {
        // Return playlist if length becomes to long
        if ((play_length_ms+s.length_ms) > length_ms)
        {
            return playlist;
        }

        playlist.push(s.ID);
        play_length_ms += s.length_ms;
    });
    
    single.forEach(s => {
        // Return playlist if length becomes to long
        if ((play_length_ms+s.length_ms) > length_ms)
        {
            return playlist;
        }

        playlist.push(s.ID);
        play_length_ms += s.length_ms;
    });

    //If all songs have been added, return playlist
    return playlist;
}

async function createSpotifyPlaylist(name, description, access_token, user_name)
{
    let options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ` Bearer ${access_token}`
        },
        body: JSON.stringify({
            'name': name,
            'description': description,
            'public': true
        })
    }
    let playlist_obj = await fetch(`https://api.spotify.com/v1/users/${user_name}/playlists`, options)
    .then(res =>
        res.json())
        .then(d => {
            console.log(d);
            return d;
    });
    return playlist_obj.id;
}

async function addMusicToPlaylist(playlist_id, songs)
{
    let options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ` Bearer ${access_token}`
        },
        body: JSON.stringify(songs),
    }
    let result = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`, options)
    .then(res =>
        res.json())
        .then(d => {
            console.log(d);
            return d;
    });
}

/**
 * Obtains parameters from the hash of the URL
 * @return Object
 */
function getHashParams() {
    let hashParams = {};
    let e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    while ( e = r.exec(q)) {
        hashParams[e[1]] = decodeURIComponent(e[2]);
    }

    return hashParams;
}

let userProfile = {};
let Owner = {};

if (error) {
    alert('There was an error during the authentication');
} else {
    if (access_token) {
        $.ajax({
            url: 'https://api.spotify.com/v1/me',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                $('#login').hide();
                $('#loggedin').show();
                return response
            }
        }).then(profile => {
            document.getElementById("owner_name").innerHTML = profile.display_name;
            document.getElementById("owner_email").innerHTML = profile.email;
            Owner = new Users(profile.display_name, profile.id, access_token, refresh_token)

            console.log(Owner);
        });
    } else {
        // render initial screen
        $('#login').show();
        $('#loggedin').hide();
    }
}

function newParticipant() {
    alert("Added new user!");
}