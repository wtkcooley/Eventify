class Users {
    constructor(name) {
        this.name = name;
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

let userProfileSource = document.getElementById('user-profile-template').innerHTML,
    userProfileTemplate = Handlebars.compile(userProfileSource),
    userProfilePlaceholder = document.getElementById('user-profile');

let userProfile = {};
let Owner = new Users("Owner");
let oauthSource = document.getElementById('oauth-template').innerHTML,
    oauthTemplate = Handlebars.compile(oauthSource),
    oauthPlaceholder = document.getElementById('oauth');

if (error) {
    alert('There was an error during the authentication');
} else {
    if (access_token) {
    // render oauth info
    oauthPlaceholder.innerHTML = oauthTemplate({
        access_token: access_token,
        refresh_token: refresh_token
    });

    $.ajax({
        url: 'https://api.spotify.com/v1/me',
        headers: {
            'Authorization': 'Bearer ' + access_token
        },
        success: function(response) {
            userProfilePlaceholder.innerHTML = userProfileTemplate(response);
            userProfile = response;

            $('#login').hide();
            $('#loggedin').show();
            return response
        }
    }).then(profile =>
        Owner = new Users(profile.display_name, access_token, refresh_token));

        console.log(Owner);
    } else {
        // render initial screen
        $('#login').show();
        $('#loggedin').hide();
    }

    document.getElementById('obtain-new-token').addEventListener('click', function() {
    $.ajax({
        url: '/refresh_token',
        data: {
        'refresh_token': refresh_token
        }
    }).done(function(data) {
        access_token = data.access_token;
        oauthPlaceholder.innerHTML = oauthTemplate({
        access_token: access_token,
        refresh_token: refresh_token
        });
    });
    }, false);
}