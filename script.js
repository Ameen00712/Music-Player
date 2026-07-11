const songs = [
{
title:"Song 1",
file:"songs/song1.mp3",
cover:"images/cover1.jpg"
},
{
title:"Song 2",
file:"songs/song2.mp3",
cover:"images/cover2.jpg"
}
];

let currentSong = 0;

const audio = document.getElementById("audio");
const title = document.getElementById("title");
const cover = document.getElementById("cover");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const volume = document.getElementById("volume");

function loadSong(index){

audio.src = songs[index].file;
title.innerHTML = songs[index].title;
cover.src = songs[index].cover;

audio.load();

}

loadSong(currentSong);

playBtn.addEventListener("click",()=>{

if(audio.paused){

audio.play();

playBtn.innerHTML='<i class="fas fa-pause"></i>';

}
else{

audio.pause();

playBtn.innerHTML='<i class="fas fa-play"></i>';

}

});

nextBtn.addEventListener("click",()=>{

currentSong++;

if(currentSong>=songs.length){

currentSong=0;

}

loadSong(currentSong);

audio.play();

playBtn.innerHTML='<i class="fas fa-pause"></i>';

});

prevBtn.addEventListener("click",()=>{

currentSong--;

if(currentSong<0){

currentSong=songs.length-1;

}

loadSong(currentSong);

audio.play();

playBtn.innerHTML='<i class="fas fa-pause"></i>';

});

audio.addEventListener("loadedmetadata",()=>{

progress.max = audio.duration;

duration.innerHTML =
formatTime(audio.duration);

});

audio.addEventListener("timeupdate",()=>{

progress.value = audio.currentTime;

currentTime.innerHTML =
formatTime(audio.currentTime);

});

progress.addEventListener("input",()=>{

audio.currentTime = progress.value;

});

volume.addEventListener("input",()=>{

audio.volume = volume.value;

});

audio.addEventListener("ended",()=>{

currentSong++;

if(currentSong>=songs.length){

currentSong=0;

}

loadSong(currentSong);

audio.play();

});

function formatTime(time){

let min = Math.floor(time/60);

let sec = Math.floor(time%60);

if(sec<10){

sec="0"+sec;

}

return min+":"+sec;

}