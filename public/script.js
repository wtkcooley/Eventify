/* JS functions for Event-ify
*/

// Array of User Objects
participants = [];
const store_participants = "participants";

artists = [];

class Users {
    constructor(name, id, access_token, refresh_token, image_src) {
        this.name = name;
        this.id = id;
        this.access_token = access_token;
        this.refresh_token = refresh_token;
        this.image_src = image_src;
        this.top_tracks = [];
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
        return new Promise(async (resolve, reject) => {

            await this.getTopTracks(this.access_token, type, limit, offset, time_range)
            .then(tracks => {
                this.top_tracks = tracks;
                
                // Run operations that require top tracks when adding new user
                let updateRes = updateArtists(tracks);
                console.log(`${updateRes == true ? "Successfully" : "Unsuccessfully"} updated artists`);

                updateParticipants(this);
            });
            resolve();
        });
    }
}

let params = getHashParams();

let access_token = params.access_token,
    refresh_token = params.refresh_token,
    error = params.error;


/**
 * Create playlist wrapper for create_playlist button
 */
async function createPlayList(e)
{
        // Disable button until playlist is created
        document.getElementById("create").disabled = true;

        // Get and validate data from text fields
        let event_name = document.getElementById("event_name").value;
        let event_desc = document.getElementById("event_desc").value;
        let playlist_length = document.getElementById("playlist_length").value;
        
        let length_ms = playlist_length*60*1000; //Convert minutes to milliseconds
        console.log(length_ms);
        const song_list = createSongList(participants, length_ms);
        if (song_list.length <= 0)
        {
            alert("Cannot create playlist. Song list is empty!");
            return false;
        }

        //Refresh user's access token to prevent bugs
        

        let owner = participants[0];
        let playlist_id = await createSpotifyPlaylist(event_name, event_desc, owner.access_token, owner.id)
        let result = await addMusicToPlaylist(playlist_id, song_list, owner.access_token);
        if (!result.error)
        {
            alert("Playlist was successfully created and added to your Spotify Account!\n(It may take a few seconds to show up in Spotify)");
        }
        else
        {
            alert(`Playlist could not be created.\nError: ${result.error.message}`);
        }
        
        // Enable button until playlist is created
        document.getElementById("create").disabled = false;
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
            
            // Check artist list
            // If multiple artists and one is unselected, don't include song
            let artist_selected = true;
            song.artists.forEach(a => {
                let option_doc = document.getElementById(a.name);
                if (option_doc.selected === false)
                    artist_selected = false;
            });

            // Skip song if the artist was not selected
            if (artist_selected)
            {

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
            value: s.rating / s.count,
            length_ms: s.length_ms
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
 * @param {string} user_id - User's Spotify ID
 * @return {string} - Spotify playlist ID
 */
async function createSpotifyPlaylist(name, description, access_token, user_id)
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
    let playlist_obj = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists`, options)
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
 * @param {string} access_token - User's access token
 * @return {string} - Snapshot ID
 */
async function addMusicToPlaylist(playlist_id, songs, access_token)
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
 * Update the genre list globally when new users are added
 * @param {JSON Object} top_tracks - List of user's top tracks
 * @return {bool} - True if successful, False if error
 */
function updateArtists(top_tracks)
{
    if (top_tracks.length < 1)
    {
        console.log("Error: cannot update artists list because tracks are empty!");
        return false;
    }

    // artist obj: { name, count }

    top_tracks.forEach(s => {
        s.artists.forEach(a => {

            // Check if artist is already in genre list
            let artist = artists.find(x => x.name === a.name);
            if (artist !== undefined)
            {
                //Increase count if already in list
                artist.count++;
            }
            else
            {
                // Otherwise add new artist to list
                let newArtist = { name: a.name, count: 1};
                artists.push(newArtist);
            }
        });
    });
    
    refreshArtistList();
    return true;
}

// function to refresh genre dropdown list
function refreshArtistList() {

    // Sort artists array by name
    let display_artists = artists.sort((a, b) => {
        let A_name = a.name.toUpperCase();
        let B_name = b.name.toUpperCase();

        if (A_name < B_name) {
            return -1;
        }
        if (A_name > B_name) {
            return 1;
        }
        return 0;
    });

    // get the dropdown element and clear the existing options
    let dropdown = document.getElementById('artists_dropdown');
    dropdown.innerHTML = '';

    // loop through the artists and add each item as an option
    display_artists.forEach(option => {
      let newOption = document.createElement("option");
      newOption.value = option.name;
      newOption.text = `${option.name} (${option.count})`;
      newOption.selected = true;
      newOption.id = option.name;
      dropdown.add(newOption);
    });
    M.FormSelect.init(document.querySelectorAll("select"));
  }


/**
 * Reset stored participants list when a new instance of the app is started
 */
function homeLogin() {
    // whipe participants list
    if (localStorage.getItem(store_participants)) {
        localStorage.removeItem(store_participants);
    }
    
    window.location.replace("/login");
}

/**
 * This allows participants to login via spotify instead of pasting their token
 */
function newParticipantLogin() {
    // Store participants list
    localStorage.setItem(store_participants, JSON.stringify(participants));

    window.location.replace("/login");
}

/**
 * This updates and adds a new user to the locally stored participants list.
 *  The old list is removed and a new one replaces it.
 * @param {*} user New user to add to list
 */
function updateParticipants(user) {
    // Remove stored list
    if (localStorage.getItem(store_participants)) {
        localStorage.removeItem(store_participants);
    }
    
    // Update or add new participant
    let participant = participants.find(x => x.name == user.name);
    if (participant)
    {
        participant.access_token = user.access_token;
        participant.refresh_token = user.refresh_token;
        participant.top_tracks = user.top_tracks;
    }
    else
    {
        user.top_tracks = user.top_tracks;
        participants.push(user);
    }

    // Add list back into storage 
    localStorage.setItem(store_participants, JSON.stringify(participants));
}

/**
 * Applies the locally stored participants list to the global participants variable
 */
function restoreParticipantList() {
    // Restore participants when redirected back
    let partList = localStorage.getItem(store_participants);
    if (partList)
    {
        participants = JSON.parse(partList);
    }
}

// Restore the locally stored participants list to the global participants variable
restoreParticipantList();

// Add new user after page load
if (error && participants.length < 1) {
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

            // Create new user
            let image_src = (profile.images[0] ? profile.images[0].url : "user.png");
            let user = new Users(profile.display_name, profile.id, access_token, refresh_token, image_src);
            user.setTopTracks().then(x => {
                
                // Set owner as first participant and update owner chip
                let owner = participants[0];

                // Set profile image for chip
                let profileImg = new Image();
                profileImg.alt = "img";
                profileImg.src = owner.image_src

                document.getElementById("owner_chip").appendChild(profileImg);
                document.getElementById("owner_name").innerHTML = owner.name;
                if (participants.length >= 1) 
                {
                    console.log(participants);
                    // Recreate chips for restored participants
                    participants.slice(1).forEach(u => {
                        createNewChip(u);
                    });

                    // Update artist list for each person
                    participants.forEach(u => {
                        updateArtists(u.top_tracks);
                    });
                }

                console.log("Logged In! User Info:")
                console.log(user);
            });
        });
    } else {
        // render initial screen
        $('#login').show();
        $('#loggedin').hide();
    }
}

/**
 * Add new participant by pasting their token.
 */
function newParticipantToken() {
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
            let image = (profile.images[0] ? profile.images[0].url : "user.png");
            participant = new Users(profile.display_name, profile.id, new_access_token, new_refresh_token, image);

            participant.setTopTracks().then(x => {
                updateArtists(participant.top_tracks);

                createNewChip(participant);
    
                alert("Added new user!");
            })
        });
    }
}

/**
 * Creates new participant chip to display users on front-end
 * @param {User} user user to create new chip for
 */
function createNewChip(user)
{
    // Create chip element
    let chip = document.createElement("div");
    chip.className = "chip participant_chip";
    chip.id = user.id;

    // Create profile img and append to chip
    let profileImg = new Image();
    profileImg.src = user.image_src;
    profileImg.alt = "img";
    chip.appendChild(profileImg);

    // Create name element and append to chip
    let name = document.createElement("span");
    name.className = "participant_name";
    name.innerHTML = user.name;
    chip.appendChild(name);

    // Create close icon and add callback function
    let close = document.createElement("i");
    close.className = "close material-icons";
    close.onclick = function() {removeParticipant(user.id)};
    close.innerHTML = "close";
    chip.appendChild(close)

    // Append chip to participants
    document.getElementById("participants-list").appendChild(chip);
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

    // Update locally stored participants list
    // Remove stored list
    if (localStorage.getItem(store_participants)) {
        localStorage.removeItem(store_participants);
    }

    // Add list back into storage 
    localStorage.setItem(store_participants, JSON.stringify(participants));
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
