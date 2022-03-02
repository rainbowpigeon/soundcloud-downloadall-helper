(async () => {
    const API_BASE_URL = "https://api-v2.soundcloud.com";

    // used by get_secret_tokens_fallback
    const TRACK_CLASS = "trackItem__trackTitle";
    // used by get_download_buttons
    const DOWNLOAD_BUTTON_CLASS = "sc-button-download";
    // used by add_download_all_button
    const ACTION_BAR_CLASS = "listenEngagement__actions";
    const BUTTON_GROUP_CLASS = "div.sc-button-group";
    
    // used by parse_js
    const CLIENT_ID_RE = /client_id:\"([a-zA-Z0-9]{32})\",/;


    //////////////////////////////// START OF UNUSED FUNCTIONS ////////////////////////////////


    /**
     * UNUSED FUNCTION
     * Scrolls back up after scroll to bottom is finished 
     * @returns {void}
     */
    function scroll_back_up_callback() {
        let scrollTimeout;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            // clean up
            window.removeEventListener('scroll', scroll_back_up_callback);
            // scroll back up to top after 3 seconds - give some time for new tracks on page to load;
            setTimeout(()=>{window.scrollTo(0,0)}, 3000);
        }, 100);
    }   


    /**
     * UNUSED FUNCTION
     * Scrolls to bottom of page, waits a while for tracks to load, then scrolls back to the top using a callback
     * @returns {void}
     */
    function scroll_to_load() {
        console.log("Scrolling to load tracks...");
        // prevent browser from restoring scrolled location state
        history.scrollRestoration = "manual";
        // scroll to bottom
        window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
        // scroll back up when scroll to bottom finishes
        window.addEventListener('scroll', scroll_back_up_callback);
    }


    /**
     * UNUSED FUNCTION
     * Retrieves all download buttons from the DOM
     * @returns {HTMLCollection} HTMLCollection of download <button>s
     */
    function get_download_buttons() {
        // sample: <button class="sc-button-download sc-bu…on sc-button-responsive" rel="nofollow" aria-describedby="tooltip-190" tabindex="0" download="<trackname>" title="Download this track" aria-label="Download this track">
        return document.getElementsByClassName(DOWNLOAD_BUTTON_CLASS);
    }


    /**
     * UNUSED FUNCTION
     * Gets secret tokens of all tracks from the DOM, but this is unreliable because tracks are subject to lazy-loading
     * @returns {Array.<string>} - Array of secret tokens in order of tracklist i.e. in order of appearance in the DOM
     */
    function get_secret_tokens_from_DOM() {
        const tracks = document.getElementsByClassName(TRACK_CLASS);
        // tracks is a HTMLCollection and can be converted to an Array with Array.from() or [...htmlCollection]. but here we will skip that step and use Array.prototype.map.call directly
        const secret_tokens = Array.prototype.map.call(tracks, track => {
            // sample: href="/<label>/<track>/<secret_token>?in=<label>/sets/<album>//<album_secret_token>"
            return track.getAttribute("href").split("/")[3].split("?")[0];
        })
        return secret_tokens;
    }    


    //////////////////////////////// END OF UNUSED FUNCTIONS ////////////////////////////////


    /**
     * Parse JS file for client ID using regex
     * @param {string} script_src - The URL of the JS file to be parsed.
     * @returns {(string|undefined)} - Client ID string if found, else undefined
     */
    async function parse_js(script_src) {
        console.log("Searching " +  script_src);
        const r = await fetch(script_src);
        const t = await r.text();
        const client_id_match = t.match(CLIENT_ID_RE);
        if (client_id_match) {
            return client_id_match[1];
        } else {
            return;
        }
    }


    /**
     * Gets client ID by searching through all crossorigin scripts in the DOM
     * @returns {(string|undefined)} - Client ID string if found, else undefined
     */
    async function get_client_id() {
        // get NodeList of crossorigin scripts
        const scripts = document.querySelectorAll('script[crossorigin]');
        // loop through scripts in reverse, since client_id is likely in last script
        for (let i = scripts.length - 1; i > -1; i--) {
            // async functions will always implicitly return Promises, so you still gotta await them
            const client_id = await parse_js(scripts[i].getAttribute('src'));
            if (client_id) {
                console.log("Client ID found: " + client_id);
                return client_id;
            }
        }
        console.log("Client ID not found");
        return;
    };


    /**
     * Gets download link of a track
     * @param {string} client_id - Client ID
     * @param {number} track_id - Track ID
     * @param {string} track_secret_token - Track's secret token
     * @returns {string} - Download link of track
     */
    async function get_download_link(client_id, track_id, track_secret_token) {
        const download_params = new URLSearchParams({
            "client_id": client_id,
            secret_token: track_secret_token,
        })
        // https://api-v2.soundcloud.com/tracks/<>/download?client_id=<>&secret_token=<>
        const download_url = API_BASE_URL + "/tracks/" + track_id + "/download?" + download_params;
        const r = await fetch(download_url);
        const j = await r.json();
        return j.redirectUri;   
    }


    /**
     * Gets playlist info from the window.__sc_hydration property
     * @param {Array.<{data:Object, hydratable:string}>} [hydration_info] - Hydration info from the __sc_hydration property
     * @returns {Object|undefined} - playlist info Object retrieved from the "data" key and contains a "tracks" key if found, else undefined
     */
    function get_playlist_hydration_info(hydration_info=window.__sc_hydration) {
        // playlist should be last Object in Array, otherwise iterate and look for hydratable: "playlist" property
        const playlist_hydration_info = hydration_info[hydration_info.length - 1];
        if (playlist_hydration_info.hydratable !== "playlist") {
            // returns undefined if not found
            return hydration_info.find(info => info.hydratable === "playlist").data;
        } else {
            return playlist_hydration_info.data;
        }
    }


    /**
     * Get info from URL using SoundCloud's resolve API endpoint
     * @param {string} client_id - Client ID
     * @param {Location|string} [url] - URL to be resolved for information
     * @returns {Object} - Resolved information in JSON format as an object literal
     */
    async function get_resolve_info(client_id, url=window.location) {
        const resolve_params = new URLSearchParams({
            "client_id": client_id,
            "url": url,
        })
        // https://api-v2.soundcloud.com/resolve?client_id=<>&url=<>
        const resolve_url = API_BASE_URL + "/resolve?" + resolve_params
        const r = await fetch(resolve_url);
        return await r.json();
    }


    /**
     * Get current playlist info (window.location) using SoundCloud's resolve API endpoint
     * @param {string} client_id - Client ID
     * @returns {Object} - Resolved current playlist information in JSON format as an object literal
     */
    async function get_playlist_info_fallback(client_id) {
        // response from resolve endpoint should be equivalent to response from playlists endpoint
        // playlists endpoint: https://api-v2.soundcloud.com/playlists/<>?client_id=<>&secret_token=<>&representation=full
        return await get_resolve_info(client_id, window.location);
    }


    /**
     * Gets information of all tracks from the current playlist
     * @param {string} client_id - Client ID
     * @returns {Map.<number,string>} - Map of tracks info with track IDs as keys and track secret tokens as values
     */
    async function get_tracks_info(client_id){
        const tracks_info = new Map();

        // get playlist info, then tracks info from playlist info
        let playlist_info = get_playlist_hydration_info();
        if (!playlist_info) {
            console.log("Playlist hydration info not found, using fallback method...");
            playlist_info = await get_playlist_info_fallback(client_id);
        }

        // tracks will be an Array of Objects {id:<>, secret_token:<>}
        const tracks = playlist_info.tracks;
        // first extract track ids and secret tokens into a Map
        for (const track of tracks) {
            tracks_info.set(track.id, track.secret_token);
        }

        // check: if last track has no urn, that means tracks info is incomplete
        // alternative: .some()
        const last_track = tracks[tracks.length - 1];
        const is_track_info_incomplete = !last_track.hasOwnProperty("urn");

        // incomplete tracks info means complete track ids but incomplete/wrong secret tokens, so we'll retrieve the correct secret tokens from SoundCloud's API
        if (is_track_info_incomplete) {
            console.log("Tracks info incomplete, resolving for remaining secret tokens...");

            // store track ids with incomplete info in new Array
            const track_ids_to_resolve = [];

            // loop through tracks in reverse since those with incomplete info will be at the back
            // alternative: .filter()
            for (let i = tracks.length - 1; i > -1; i--) {
                if (!tracks[i].hasOwnProperty("urn")) {
                    // push to front of array
                    track_ids_to_resolve.unshift(tracks[i].id);
                } else {
                    // exit out of for loop early when encountering the first track with complete info
                    break;
                }
            }

            // https://api-v2.soundcloud.com/tracks?ids=<id1>,<id2>&playlistId=<playlist_id>&playlistSecretToken=<playlist_secret_token>&client_id=<client_id>&[object Object]
            const params = new URLSearchParams({
                "ids": track_ids_to_resolve.join(), // can also implicitly coerce it into a string or use .toString()
                "playlistId": playlist_info.id,
                "playlistSecretToken": playlist_info.secret_token,
                "client_id": client_id,

            })
            const resolve_url = API_BASE_URL + "/tracks?" + params;
            const r = await fetch(resolve_url);
            const j = await r.json();

            for (const track of j) {
                // update tracks info Map with correct secret tokens
                tracks_info.set(track.id, track.secret_token);
            }
        }
        return tracks_info;
    }


    /**
     * Main function for initiating the process of getting client ID, finding all tracks' download links and opening them in a new tab/window
     * @returns {void}
     */
    async function main_download_all_tracks() {
        // get client ID by bruteforcing crossorigin scripts
        const client_id = await get_client_id();

        // get track id and track secret token of each track stored as a Map
        const tracks_info = await get_tracks_info(client_id);

        // get download links for each track
        const download_links = await Promise.all(Array.from(tracks_info, async ([track_id, track_secret_token]) => {
            return get_download_link(client_id, track_id, track_secret_token);
        }));

        for (const link of download_links) {
            console.log(link);
            // pop-up blocker needs to be disabled
            window.open(link);
        }        
    }


    /**
     * Removes all HTML elements belonging to a particular class
     * @param {string} class_name - Class name that elements should have to be removed 
     * @returns {void}
     */
    function remove_elements_by_class(class_name) {
        const elements = document.getElementsByClassName(class_name);
        while (elements.length > 0) elements[0].remove();
        // alternative implementation below, but note that qSA returns a NodeList that will not reflect live changes in the DOM.
        // document.querySelectorAll("."+class_name).forEach(el => el.remove());
    }


    /** Creates a HTML button in the style of SoundCloud's listenEngagement action buttons, and with "rainbowpigeon" class for easy identification
     * @param {string} text - Text for button
     * @returns {HTMLButtonElement} - HTML <button>
     */
    function create_soundcloud_button(text) {
        // create download button
        const button = document.createElement('button');
        // sample: <button type="button" class="sc-button-queue addToNextUp sc-button-secondary sc-button sc-button-medium sc-button-responsive" aria-describedby="tooltip-179" tabindex="0" title="Add to Next up" aria-label="Add to Next up">
        button.classList.add("sc-button", "sc-button-secondary", "sc-button-medium", "sc-button-responsive");
        // for easy identification when removing existing download buttons
        button.classList.add("rainbowpigeon");
        button.setAttribute("tabindex", "0");
        button.setAttribute("title", text);
        button.setAttribute("aria-label", text);
        // too lazy to create the <span>s with sc-button-label classes within
        button.textContent = text;
        return button;
    }


    /** Creates and adds "Download all" HTML button to SoundCloud's listenEngagement action bar
     * @returns {void}
     */
    function add_download_all_button() {
        // remove existing download buttons created by this script
        remove_elements_by_class("rainbowpigeon");
        const download_all_button = create_soundcloud_button("Download all");
        // the alternative .onclick() can only take one listener max. if redefined the existing one will be overwritten.
        download_all_button.addEventListener('click', main_download_all_tracks);
        const action_bar = document.getElementsByClassName(ACTION_BAR_CLASS)[0]; // preferably should return only one
        const button_group = action_bar.querySelector(BUTTON_GROUP_CLASS);
        button_group.appendChild(download_all_button);
    }

    add_download_all_button();

})();