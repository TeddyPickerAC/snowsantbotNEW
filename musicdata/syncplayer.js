const {
	MessageEmbed,
	MessageActionRow,
	MessageButton,
} = require('discord.js');
const shangus = require('mongoose');
const serverPlayerInfo = require('../structures/musicPreference.js');
const playerSchema = new shangus.Schema({
	guildId: String,
	channelId: String,
	playermsgId: String,
	isSetupped: Boolean,
});
const guildPlayer = shangus.model('serverPlayerList', playerSchema);

//index.js or /setup명령어 쓸때 ㄱㄱ

function updatePlayerMsg(server, interaction){
	let queuelist = '<여기에 대기열 목록 표시됨>';
	if(server.queue.songs.length > 1){
		queuelist = '';
		for(let i = server.queue.songs.length - 1; i >= 1; i--){
			if(i > 19){
				i = 19;
				queuelist = `...이외에 ${Number(server.queue.songs.length) - i - 1}개의 곡 대기 중\n`;
			}
			queuelist += `#${i}. [${server.queue.songs[i].duration}] ${server.queue.songs[i].title} by ${server.queue.songs[i].request.name}\n`;
		}
	}

	getPlayerEmbed(server).then( playerEmbed => {
		if(interaction != undefined){
			interaction.update({content: queuelist, embeds: [playerEmbed]});
		}else{
			server.playerInfo.playermsg.edit({content: queuelist, embeds: [playerEmbed]});
		}
	});
}

async function getPlayerEmbed(server){
	const ytdl = require('ytdl-core');
	const timecalc = require('../structures/timestampcalculator.js');

	if(server.queue.songs.length > 0){
			const author = server.queue.songs[0].author;

			if(!author){
				const info = await ytdl.getInfo(server.queue.songs[0].url);
				server.queue.songs[0].author = {
					name: info.videoDetails.author.name,
					thumbnail: info.videoDetails.author.thumbnails[0].url,
					channelURL: info.videoDetails.author.channel_url,
				}
			}else if(!author.thumbnail){
				const info = await ytdl.getInfo(server.queue.songs[0].url);
				author.thumbnail = info.videoDetails.author.thumbnails[0].url;
			}
		}

	return server.queue.songs.length > 0 
		? new MessageEmbed({
			author: {
				name: `${server.queue.songs[0].author.name}`,
				icon_url: `${server.queue.songs[0].author.thumbnail}`,
				url: `${server.queue.songs[0].author.channelURL}`,
			},
			title: server.queue.songs[0].title,
			color: '#f4a261',
			description: `${server.connectionHandler.connectionStatus} | ${server.queue.playinfo.playmode} | 🔉 : ${Math.round(server.queue.playinfo.volume * 100)}% | 러닝타임 ${timecalc.getTimestamp(timecalc.timestamptoSec(server.queue.songs))}`,
			url: server.queue.songs[0].url,
			image: {url: server.queue.songs[0].thumbnail},
			footer:{
				text: `requested by ${server.queue.songs[0].request.name} | ${server.queue.songs[0].duration}`,
				icon_url: server.queue.songs[0].request.avatarURL,
			}
		})
		: new MessageEmbed({
			title: '아무 노래도 틀고 있지 않아요..',
			color: '#f4a261',
			description: '다른 채널에서 /play 명령어로 노래를 틀거나\n이곳에 노래 제목이나 링크를 써 주세요.',
			image: {
				url: 'https://story-img.kakaocdn.net/dn/kWE0N/hyKZWY3Jh6/FAK0m5sKEgvpXVNZk8zXgK/img_xl.jpg?width=662&height=454&avg=%2523ceaf6f&v=2'
			},
		});
}

async function syncChannel(channel){
	const server = require('../structures/musicPreference.js').musicserverList.get(channel.guild.id);
	await channel.bulkDelete(50)
		.catch(e => {
			console.log(e);
		});

	const toReactEmbed = await getPlayerEmbed(server);

	const playerBannerMsg = await channel.send({
		content: `**플레이어 사용법**\n\n이 채널에 채팅으로 명령어 접두사 없이 그냥 쌩으로 노래제목/링크/플레이리스트 링크를 치면 노래가 재생돼요.\n\n**기본 기능**\n⏯️ : 노래 일시정지 | 다시재생 \n⏏️ : 노래 멈추고 모든 노래 제거, 초기화, 음성 채널 나감 \n⏹️ : 노래 멈추고 대기 중인 모든 노래 제거, 모든 상태(루프 등) 초기화\n⏭️ : 노래 스킵 \n\n**고급 기능**\n🔀 : 대기열 셔플 \n🔂 : 싱글 루프 모드 활성화/비활성화 \n🔁 : 대기열 반복 모드 활성화/비활성화 \n♾️ : 자동 재생 모드 활성화/비활성화\n\n**추가 기능**\n🔈 : 볼륨 10% 감소 \n🔊 : 볼륨 10% 증가 \n❌ : 대기열 맨 마지막 노래 지우기 \n⤴️ : 다음 곡을 대기열 맨 뒤로 옮기기 \n⤵️ : 대기열 맨 마지막 노래를 맨 앞으로 옮기기`,
		files: ['./attatchments/playerbanner.jpg'],
	});

	let queuelist = '<여기에 대기열 목록 표시됨>';
	if(server.queue.songs.length > 1){
		queuelist = '';
		for(let i = server.queue.songs.length - 1; i >= 1; i--){
			if(i > 19){
				i = 19;
				queuelist = `...이외에 ${Number(server.queue.songs.length) - i - 1}개의 곡 대기 중\n`;
			}
			queuelist += `#${i}. [${server.queue.songs[i].duration}] ${server.queue.songs[i].title} by ${server.queue.songs[i].request.name}\n`;
		}
	}

	const playermsg = await channel.send({
		content: queuelist,
		embeds: [toReactEmbed], //노래 틀어져있으면 정보 따라서 아니면 Default
		components: [
			{
				type: 'ACTION_ROW', //playpause | eject | stop | skip
				components: [
				{
					type: 'BUTTON',
					customId: 'playpause',
					emoji: '⏯️',
					style: 'PRIMARY',
				},
				{
					type: 'BUTTON',
					customId: 'eject',
					emoji: '⏏️',
					style: 'DANGER',
				},
				{
					type: 'BUTTON',
					customId: 'stop',
					emoji: '⏹️',
					style: 'DANGER',
				},
				{
					type: 'BUTTON',
					customId: 'skip',
					emoji: '⏭️',
					style: 'DANGER',
				}]
			},
			{
				type: 'ACTION_ROW', //shuffle | singleLoop | queueloop | autoplay
				components: [
				{
					type: 'BUTTON',
					customId: 'shuffle',
					emoji: '🔀',
					style: 'SECONDARY',
				},
				{
					type: 'BUTTON',
					customId: 'singleloop',
					emoji: '🔂',
					style: 'SECONDARY',
				},
				{
					type: 'BUTTON',
					customId: 'queueloop',
					emoji: '🔁',
					style: 'SECONDARY',

				},
				{
					type: 'BUTTON',
					customId: 'autoplay',
					emoji: '♾️',
					style: 'SECONDARY',
				}]
			},
			{
				type: 'ACTION_ROW', //volumeReduce | volumeIncrease | deleteRecentSong | StackupNextSong | PushdownRecentSong
				components: [
				{
					type: 'BUTTON',
					customId: 'volumereduce',
					emoji: '🔈',
					style: 'SECONDARY',
				},
				{
					type: 'BUTTON',
					customId: 'volumeincrease',
					emoji: '🔊',
					style: 'SECONDARY',
				},
				{
					type: 'BUTTON',
					customId: 'deleterecentsong',
					emoji: '❌',
					style: 'SECONDARY',
				},
				{
					type: 'BUTTON',
					customId: 'stackup',
					emoji: '⤴️',
					style: 'SECONDARY',
				},
				{
					type: 'BUTTON',
					customId: 'pushdown',
					emoji: '⤵️',
					style: 'SECONDARY',
				}]
			}
		],
	});

	server.playerInfo.playermsg = playermsg;
	server.playerInfo.playerChannelId = channel.id;
	server.playerInfo.isSetupped = true;

	try{ //messageCollector section
		const messageCollector = channel.createMessageCollector();

		messageCollector.on('collect', async (message) => {
			const wait = require('util').promisify(setTimeout);

			if(message.author.id == '919288477516967957'){
				await wait(10000);
				if(message.deletable) message.delete(); //일단 킵해두자 개씨발 좆같은개발자 애미찾으러감
			}else{ //씬봇 감지용
				server.queue.channel = server.playerInfo.playermsg.channel;
				await require('./stream.js').trigger(message, message.content, 'player');
				await wait(1000);	
				await message.delete();
			}
		});

	}catch(error){
		console.log(error);
		//몰라
	}

	try{ //buttoncollector section
		const buttonCollector = channel.createMessageComponentCollector();
		
		buttonCollector.on('collect', async (interaction) => {
			if(!interaction.isButton()) return;
			if(!interaction.member.voice.channel) return interaction.channel.send(`${interaction.user}, 먼저 음성 채널에 들어가주세요!`);
			if(server.queue.length == 0) return interaction.channel.send('아무 노래도 틀고 있지 않아요');
			
			switch(interaction.customId){
				case 'playpause':
					await server.pause(interaction);
					break;

				case 'eject':
					await server.eject(interaction);
					break;

				case 'stop':
					await server.stop(interaction);
					break;

				case 'skip':
					await server.skip(interaction);
					break;

				case 'shuffle':
					await server.shuffle(interaction);
					break;

				case 'singleloop':
				case 'queueloop':
				case 'autoplay':
					await server.loop(interaction);
					break;

				case 'volumereduce':
					server.queue.playinfo.volume = (server.queue.playinfo.volume - 0.1 <= 0) ? 0 : server.queue.playinfo.volume - 0.1;
					await server.connectionHandler.audioResource.volume.setVolume(server.queue.playinfo.volume);
					break;

				case 'volumeincrease':
					server.queue.playinfo.volume = (server.queue.playinfo.volume + 0.1 >= 1) ? 0 : server.queue.playinfo.volume + 0.1;
					await server.connectionHandler.audioResource.volume.setVolume(server.queue.playinfo.volume);
					break;

				case 'deleterecentsong':
					if(server.queue.songs.length < 2) return interaction.channel.send('대기열에 적어도 곡을 한 개 이상 넣어주세요');
					server.queue.songs.pop();
					if(server.queue.songs.length == 1 && server.queue.playinfo.playmode == '♾️ 자동 재생 모드'){
						const recRes = await require('../structures/autoRecommandSearch.js').autoRecommandSearch(server.queue.songs[0].url, interaction, null);
						server.queue.songs.push(recRes);
					}
					break;

				case 'stackup':
					if(server.queue.songs.length < 3) return interaction.channel.send('대기열에 노래가 최소 두 곡 이상이어야 합니다');
					server.queue.songs.push(server.queue.songs.splice(1,1)[0]);
					break;

				case 'pushdown':
					if(server.queue.songs.length < 3) return interaction.channel.send('대기열에 노래가 최소 두 곡 이상이어야 합니다');
					server.queue.songs.splice(1, 0, server.queue.songs.pop());
					break;
			}
			updatePlayerMsg(server, interaction);
		});
	}catch (error){

	}
}

module.exports = {
	updatePlayerMsg,
	syncChannel,
	guildPlayer,
}
