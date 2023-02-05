/* JS functions for Event-ify
*/

// Array of User Objects
participants = [];

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
 * Create playlist wrapper for create_playlist button
 */
async function createPlayList()
{
    // Get and validate data from text fields
    let event_name = document.getElementById("event_name").value;
    let event_desc = document.getElementById("event_desc").value;
    let playlist_length = document.getElementById("playlist_length").value;
    
    let length_ms = playlist_length*60*1000; //Convert minutes to milliseconds
    const song_list = createSongList(participants, length_ms);

    let playlist_id = await createSpotifyPlaylist(event_name, event_desc, Owner.access_token, Owner.id)
    await addMusicToPlaylist(playlist_id, song_list);
}

/**
 * Creates list of song URIs using our custom algorithm for determining song choice.
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
        if (play_length_ms > length_ms)
        {
            return playlist;
        }

        playlist.push(s.ID);
        play_length_ms += s.length_ms;
    });
    
    single.forEach(s => {
        // Return playlist if length becomes to long
        if (play_length_ms > length_ms)
        {
            return playlist;
        }

        playlist.push(s.ID);
        play_length_ms += s.length_ms;
    });

    //If all songs have been added, return playlist
    return playlist;
}

/**
 * Create a playlist on spotify for the user
 * @param {Strings} name - Name for new playlist
 * @param {string} description - Description for playlist
 * @param {string} access_token - Owners access token
 * @param {string} user_name - User's username
 * @return {string} - Spotify playlist ID
 */
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

/**
 * Add music to a newly created playlist
 * @param {Strings} playlist_id - Spotify playlist ID
 * @param {string Array} songs - List of spotify song URIs
 * @return {string} - Snapshot ID
 */
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

    return result;
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
            let eventify_token = access_token + ',' + refresh_token;
            console.log(eventify_token.replace(/(\r\n|\n|\r)/gm, ""));
            document.getElementById("eventify_token").innerHTML = eventify_token.replace(/(\r\n|\n|\r)/gm, "");
            let profileImg = new Image();
            profileImg.src = profile.images[0].url;
            profileImg.alt = profile.display_name + "'s profile image";
            document.getElementById("owner_chip").appendChild(profileImg);
            document.getElementById("owner_name").innerHTML = profile.display_name;
            Owner = new Users(profile.display_name, profile.id, access_token, refresh_token);
            participants.push(Owner);

            console.log("Logged In! Owner Info:")
            console.log(Owner);
        });
    } else {
        // render initial screen
        $('#login').show();
        $('#loggedin').hide();
    }
}

function newParticipant() {
    let eventify_token = prompt("What is your participants Event-ify token?");
    if (eventify_token) {
        new_access_token = eventify_token.split(',')[0];
        new_refresh_token = eventify_token.split(',')[1];
        const options = {
            headers: {
                'Authorization': 'Bearer ' + new_access_token
            }
        }
        fetch('https://api.spotify.com/v1/me', options)
        .then(resp => resp.json())
        .then(profile => {
            if (participants.find(user => user.id === profile.id)) {
                alert(profile.display_name + " is already in your event participants. No need to add them again!")
                return false;
            }
            // Create Participant User object and append to participants array
            participant = new Users(profile.display_name, profile.id, new_access_token, new_refresh_token);
            participants.push(participant);

            // Create chip element
            let chip = document.createElement("div");
            chip.className = "chip participant_chip";
            chip.id = profile.id;

            // Create profile img and append to chip
            let profileImg = new Image();
            profileImg.src = profile.images[0].url;
            profileImg.alt = profile.display_name + "'s profile image";
            chip.appendChild(profileImg);

            // Create name element and append to chip
            let name = document.createElement("span");
            name.className = "participant_name";
            name.innerHTML = profile.display_name;
            chip.appendChild(name);

            // Create close icon and add callback function
            let close = document.createElement("i");
            close.className = "close material-icons";
            close.onclick = function() {removeParticipant(profile.id)};
            close.innerHTML = "close";
            chip.appendChild(close)

            // Append chip to participants
            document.getElementById("participants-list").appendChild(chip);
            alert("Added new user!");
        });
    }
}

function copyToken() {
    // Get the text to be copied
    var textToCopy = document.getElementById("eventify_token").innerHTML;

    // Create a textarea element for the text
    var textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    document.body.appendChild(textarea);

    // Select the text in the textarea
    textarea.select();

    // Copy the text to the clipboard
    document.execCommand("copy");

    // Remove the textarea element
    document.body.removeChild(textarea);

    // Alert the copied text
    alert("Copied your Event-ify Token!");
}

function removeParticipant(id) {
    alert("Removing Participant");
    participants = participants.filter(function( user ) {
        return user.id !== id;
    });
}