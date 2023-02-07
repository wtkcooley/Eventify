# Event-ify

Event-ify was created in 24hrs for the 2023 CU Hackit Hackathon by William Tristan Cooley and Brandon Evans

# Demo Video

Video is too large to embed in this `README.md`, but you can view a demo of the application ![here](https://github.com/wtkcooley/Eventify/blob/main/artifacts/Event-ify%20Demo%20Video.mov)

NOTE: More features may have been added since demo

# Try me

Checkout my live deployment [here](https://event-ify.onrender.com/)

NOTE: We currently have basic access to the Spotify API, so you must be added to an beta tester allow list before being able to login with our Spotify OAuth. If you want to use the app feel free to [email us](mailto:williamtcooley@gmail.com) your account email to be added. We have appilied for full developer accounts with Spotify and are hoping to get access soon, so anyone can use the app!

## Intro/User Guide

### What is Event-ify?

Are you hosting an event and want to ensure the playlist reflects everyone's taste? Look no further! Event-ify allows you and your guests/event participants to log in with Spotify and create a playlist that reflects everyone's musical taste.

### How does Event-ify work?

Event-ify uses Spotify's API to get the top 50 tracks you and your friends have each been listening to, then uses our special Event-ify algorithm to generate a playlist that is automatically added to your Spotify account, prioritizing you and your participants shared top songs and your most listened-to songs.

### How do I use Event-ify?

All you need to do to start is login with Spotify. You will then be redirected to our event creation page where you can fill out information to describe your event and add participants to your event (you are added as a participant by default). To add participants just ask your guests to login to Event-ify and send you their personal Event-ify Token which can be found and copied their clipboard at the top of the page when they login.

## Dev Quickstart Guide

### Installation

To install the dependencies of the app.js run:

`npm install` or `npm i`

### .env API Keys

For security non of our Spotify API keys are in the repo and old ones from past commits have been refreshed, so we can keep this a public repo without leaking our API keys. To start the `app.js` server first create a `.env` file in the repo and add your keys from the Spotify Dev Console:

```
CLIENT_ID = '<client_id>'
CLIENT_SECRET = '<client_secret>'
REDIRECT_URI = 'localhost:8888/callback'
```

### Start `app.js`

To start the backend server locally run:

`node app.js`

## Modifying Code

We intentionally did not use any complicated JS frameworks like React, Angular, or Vue because we wanted to create our project quickly given the 24 hour time limit. This means any modifying you would need to due to edit the functionality of the app can simply be done in the `index.html` or `script.js` files. The `index.html` contains all of the front-end UI exceot for the extra participants that the back-end appends to the participants list. The `script.js` has a class called `User`, some helper functions, and some onClick functions for the `index.html`.

### How does it work?

#### Participants

When a user logs in the `script.js` runs a `/me` call on the Spotify API using the newly create OAuth token. It uses that information to create a new instance of the User class globally accessable called `Owner` then it appends `Owner` to a gloably accessable array of `User` objects called `participants`. The `script.js` then creates a participant in the front-end participant list that cannot be removed. Participants can then be added by pasting in their "Eventify Token" which is jsut their Spotify Auth token + their refresh token concatinated with a comma character inbetween. When a new participant is added a new `User` is created and added to the participants.

#### Playlist Creation

A playlist is created by looping though all of the participants and getting their top 50 songs via the Spotify API and then using a algorithm to create a sorted list of songs by priority. That sorted list of songs is then appened to a playlist until the total time of the playlist exceeds the users requested playlist duration.
