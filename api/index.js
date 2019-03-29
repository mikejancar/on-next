const fs = require('fs');
const dates = require('date-fns');
const fetch = require('node-fetch');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const tvdbCredentials = {
  "apikey": "GMNC9QNY5TP0FTRQ",
  "username": "mikejancar8kp",
  "userkey": "OKTAPMDWI1N05B0Q"
};

exports.getNextEpisodeDate = async (event, context, callback) => { 
  try {
    const apiToken = await login();
    if (apiToken) {
      const imdbId = await getImdbId(event.query, apiToken);
      if (imdbId) {
        const nextAirDate = await getNextAirDate(imdbId);
        const dateFormatted = dates.format(nextAirDate, 'dddd, MMMM D, YYYY');
        if (dateFormatted !== 'Invalid Date') {
          return { query: event.query, nextAirDate: dateFormatted };    
        }
      }
    }
  } catch (error) {
    logMessage(`Unhandled exception: ${error}`, true);
  }
  return { query: event.query, nextAirDate: '' };
}

async function login() {
  const options = {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tvdbCredentials)
  };
  
  const tvdbUrl = `https://api.thetvdb.com/login`;
  const response = await fetch(tvdbUrl, options);

  if (response.status === 200) {
    logResponse(tvdbUrl, response);
    const body = await response.json();
    return body.token;
  }
  logResponse(tvdbUrl, response, true);
}

async function getImdbId(seriesQueried, apiToken) {
  const options = {
    method: 'get',
    headers: { 'Authorization': `Bearer ${apiToken}` }
  };
  
  let tvdbUrl = `https://api.thetvdb.com/search/series?name=${seriesQueried}`;
  let response = await fetch(tvdbUrl, options);

  if (response.status === 200) {
    logResponse(tvdbUrl, response);
    let body = await response.json();
    const seriesId = body.data[0].id;

    tvdbUrl = `https://api.thetvdb.com/series/${seriesId}`;
    response = await fetch(tvdbUrl, options);

    if (response.status === 200) {
      logResponse(tvdbUrl, response);
      body = await response.json();
      return body.data.imdbId;
    }
    logResponse(tvdbUrl, response, true);
  } else {
    logResponse(tvdbUrl, response, true);
  }
}

async function getNextAirDate(imdbId) {
  const imdbUrl = `https://www.imdb.com/title/${imdbId}/episodes?ref_=tt_ov_epl`;
  const response = await fetch(imdbUrl);

  if (response.status === 200) {
    logResponse(imdbUrl, response);

    const responseText = await response.text();
    const { document } = new JSDOM(responseText).window;
    const episodeDateElement = document.querySelector('h3#nextEpisode > span');

    if (episodeDateElement) {
      const episodeDateText = episodeDateElement.innerHTML
        .replace('(', '')
        .replace(')', '')
        .replace('airs ', '')
        .replace(/\./, '');
      const datePieces = episodeDateText.split(' ');
      const newDate = `${datePieces[1]} ${datePieces[0]} ${datePieces[2]}`;
      
      return dates.parse(newDate);
    } else {
      logMessage(`A nextEpisode element was not found at ${imdbUrl}`, true);
    }
  } else {
    logResponse(imdbUrl, response, true);
  }
}

function logMessage(message, isError) {
  if (isError) {
    console.error(message);
  } else {
    console.info(message);
  }
}

function logResponse(url, response, isError) {
  const message = `${url}: ${response.status} - ${response.statusText}`;
  if (isError) {
    console.error(message);
  } else {
    console.info(message);
  }
}
