import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import makeStyles from '@material-ui/styles/makeStyles';
import { connect } from 'react-redux';
import { buyInStacke } from 'redux/actions/payment';
import { setTradeToken } from 'redux/actions/user';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton'
import { createRoom, joinRoom, getActiveRoom} from 'redux/actions/gamePlay';
import { bindActionCreators } from 'redux';
import { CustomButton, CustomLineChart } from 'components/elements';
import ChatUI from '../components/chat'
import { fetchData, getCryptoData } from '../components/chart/TradingAPI';
import PauseImage from 'assets/image/pause_btn.png'
import ClockImage from 'assets/image/clock.png';
import { setGameScore, setGameInfo, getWinnerState } from './gameAPICalls';
import { CustomAlert } from 'components/elements';
import WinnerModal from './winnerModal';
import LoserModal from './loserModal';
import PauseModal from './pauseGame';

const useStyles = makeStyles((theme) => ({
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  tradingView: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  graphView : {
    position: 'absolute',
    width: '80%',
    height: '66%',
  },
  headerBar: {
    width: '100%',
    justifyContent: 'flex-end',
    display: 'flex',
    alignItems: 'end',
    padding: '1.7vw'
  },
  userStakeInfoStyle: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: '2vw',
    paddingLeft: '2vw',
    marginRight: '2vw',
    display: 'flex',
    borderWidth: 3,
    borderRadius: 10,
    borderColor: theme.palette.primary.buttonBottomBorder,
    borderStyle: 'solid',
    '& p': {
      fontWeight: 'bold',
      fontFamily: theme.font.CeliasMedium,
      color: 'white',
      fontSize: '2vw',
      margin: 0
    }
  },
  closeUI: {
    padding: 9,
    backgroundColor: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    '& p': {
      fontSize: 15,
      fontWeight: 'bold'
    }
  },
  jackpotInfoStyle: {
    paddingTop: '1vw',
    paddingBottom: '1vw',
    paddingRight: '2vw',
    paddingLeft: '2vw',    
    display: 'flex',
    borderWidth: 3,
    borderRadius: 10,
    borderColor: theme.palette.primary.buttonBottomBorder,
    borderStyle: 'solid',
    marginRight: '3vw',
    '& p': {
      fontFamily: theme.font.CeliasMedium,
      color: 'white',
      fontWeight: 'bold',
      fontSize: '2.5vw',
      margin: 0
    }
  },
  chatUI: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 100
  },
  gameTime : {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    top: 20,
    right: '7vw',
    zIndex: 2,
    '& img': {
      width: 70
    },
    '& p': {
      fontSize: 12,
      color: '#fff',
      textAlign: 'center',
      margin: 0,
      paddingTop: 5
    }
  },
  pauseGameStyle: {
    position: 'absolute',
    zIndex: 50,
    cursor: 'pointer',
    left: '5vw',
    top: 20,
    '& img': {
      width: 70
    }
  },
  joinedUserList: {
    display: 'flex',
    paddingTop: '1vw',
    paddingBottom: '3vw',
    minHeight: '10vw', 
    justifyContent: 'flex-start',
    borderWidth: 5,
    borderRadius: 15,
    borderColor: theme.palette.primary.buttonTopBorder,
    borderStyle: 'double',
    marginRight: 40,
    marginLeft: 40,
    marginBottom: 20
  },
  joinedUserStyle: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    marginRight: 20,
    marginLeft: 20,
    '& p': {
      textAlign: 'center',
      margin: 0,
      color: theme.palette.base.white,
      fontFamily: theme.font.CeliasMedium,
      fontSize: '1.5vw',
      fontWeight: 'bold'
    },
    '& svg': {
      fontSize: 40
    },
    '& img': {
      width: '6vw'
    }
  },
  waitingScreenStyle: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0000008f',
    position: 'absolute',
    zIndex: 25,
    '& p': {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 50,
      margin: 0,
      textAlign: 'center'
    }
  },
  takeWinStyle:{
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    bottom: '8vh',
    right: '10vw',
    zIndex: 20,
  }
}));

const markColorList = [
  '#ee4035',
  '#f37736',
  '#fdf498',
  '#7bc043',
  '#0392cf',
  '#fe9c8f',
  '#f9caa7',
  'fe8a71'
]
const SocketURL = process.env.REACT_APP_SOCKET
const client = new W3CWebSocket(SocketURL);
const totalGameTime = 120;
const gameWatingTime = 30;  
function MainGameScreen(props) {
  const { setTradeToken, paymentInfo, history, userInfo, buyInStacke, createRoom, joinRoom, getActiveRoom, playRoom } = props;
  const [ waitingTime, setWaitingTime ] = useState(gameWatingTime);
  const [ gameTime, setGameTime ] = useState(totalGameTime);
  const [ playersTokens, setPlayersTokens] = useState([]);
  const [ currentPlayers, setCurrentPlayers] = useState([]);
  const [ jackPot, setJackPot ] = useState(0);
  const [ gameWinDialogShow, setGameWinDialogShow ] = useState(false);
  const [ gameLoseDialogShow, setGameLoseDialogShow ] = useState(false)
  const [ gamePauseDialogShow, setGamePauseDialogShow ] = useState(false);
  const [ gameBetCoin, setGameBetCoin ] = useState(0);
  const [ sendingMessageUser, setSendingMessageUser ] = useState('');
  const [ chatMessages, setChatMessages ] = useState([]);
  const [ messageUIOpen, setMessageUIOpen ] = useState(false);
  const [ chartProps, setChartProps ] = useState({
    range : 1000 * 125,
    graphData : {
      prices: [],
      dates: [],
      lastPrice: -20000
    }
  });
  useEffect(() => console.log('RESTARTED'), [])
  const classes = useStyles();
  let waitingTimerId = useRef(null);
  let gamePlayTimeId = useRef(null);
  let apiFetchTimerId = useRef(null);
  let chartWrapper = null;
  // let lineSeries = useRef(null);
  let chartData = useRef([]);
  let startingGame = useRef(false);
  let takeTokenCount = useRef(2);
  const [errorShow, setErrorShow] = useState({show: false, message: 'Net Error', type: 'error'});

  useEffect(() => {
    if (!paymentInfo || !paymentInfo.betCoin) {
      clearInterval(waitingTimerId.current);
      clearInterval(gamePlayTimeId.current);
      history.push('/game');
    } else {
      setTradeToken(-1);
      //socket connection
      client.onopen = () => {
        console.log('WebSocket Client Connected');
      };
      
      loginGameRoom();
      // drawing chart
    }
  }, []);

  useEffect(()=> {
    if (waitingTime < 1 ) {
      clearInterval(waitingTimerId.current);
      gamePlayTimeCountDown();
    }
  }, [waitingTime])

  useEffect(()=> {
    if (gameTime < 1 ) {
      clearInterval(gamePlayTimeId.current);
      getWinnerState({playerName: userInfo.name, roomId: playRoom.id})
        .then((res)=> {
          if (res) setGameWinDialogShow(true);
          else setGameLoseDialogShow(true);
        })
        .catch(()=> {
          setGameLoseDialogShow(true);
        })
    }
  }, [gameTime])


  const loginGameRoom = () => {
    const username = userInfo.name;
    if (username.trim()) {
      getActiveRoom()
        .then((r)=> {
          joinRoom({roomId: r.id, betCoin: paymentInfo.betCoin})
            .then((res)=> {
              joinGameSuccess(res);
            })          
        })
        .catch(()=>{
          createRoom({betCoin: paymentInfo.betCoin})
            .then((res)=> {
              joinGameSuccess(res);
            })
            .catch(()=> history.push('/game'))
        })
    }
  }

  const joinGameSuccess = async(response) => {
    const username = userInfo.name;
    const result = await setGameInfo({
      roomId: response.id,
      playerName: userInfo.name,
      betCoin: paymentInfo.betCoin,
      score1: 0,
      score2: 0
    });
    if (result) {
      client.send(JSON.stringify({
        roomId: response.id,
        username: username,
        type: "userevent",
        betCoin: paymentInfo.betCoin,
        tokenTimes: [],
        tokenPrices: []
      }));
      setGameBetCoin(paymentInfo.betCoin);
      const startGameTime = (Date.now() - (new Date(response.createdDate)).getTime())/1000;
      startingGame.current=true;
      startGame(Math.floor(waitingTime - startGameTime));
      receiveGameData();
      apiFetchTimerId.current = setInterval(fetchApiData, 2000);
      // const res = createLineChart();
      // chartWrapper = res.chart;
      // lineSeries.current = res.lineSeries;
      // handleWindowResize();
      
      // window.addEventListener('resize', handleWindowResize);
      buyInStacke(0);

    } else history.push('/game');
  }
  const receiveGameData = () => {
    client.onmessage = (message) => {
      const dataFromServer = JSON.parse(message.data);
      console.log(dataFromServer)
      if (dataFromServer.type === "messageChange") {
        if (dataFromServer.data.roomMessages)
          setSendingMessageUser(dataFromServer.data.roomMessages.user1);
        setChatMessages(
          [
            ...chatMessages,
            dataFromServer.data.roomMessages
          ]
        );
        setMessageUIOpen(true);
      } else {
        setJackPot(dataFromServer.data.roomPlayers.jackPot);
        if (dataFromServer.type === "userevent") {
          let players = []
          Object.keys(dataFromServer.data.roomPlayers).forEach(item=>{
            if (item !== 'jackPot') {
              players.push(dataFromServer.data.roomPlayers[item].username);
            }
          })
          setCurrentPlayers([
            ...currentPlayers,
            ...players
          ]);
        }

        if (dataFromServer.type === "contentchange") {
          let playerTokens = [];
          Object.keys(dataFromServer.data.roomPlayers).forEach(userId => {
            if (userId !== 'jackPot') {
              dataFromServer.data.roomPlayers[userId].tokenTimes.forEach((time, index) => {
                playerTokens.push({
                  x: time,
                  y: dataFromServer.data.roomPlayers[userId].tokenPrices[index],
                  marker: {
                    size: 5,
                    fillColor: '#fff',
                    strokeColor: dataFromServer.data.roomPlayers[userId].username === userInfo.name ? 'red' : markColorList[2],
                    radius: 2,
                    cssClass: 'apexcharts-custom-class',
                    offsetY: 0,
                  },
                  label: {
                    offsetY: 10,
                    borderColor: 'transparent',
                    style: {
                      strokeColor: 'transparent',
                      fontWeight: 'bold',
                      background: 'transparent',
                      fontFamily: "celias-medium",
                      color: dataFromServer.data.roomPlayers[userId].username === userInfo.name ? 'red' : markColorList[2],
                      fillColor: 'transparent',
                      fontSize: 24
                    },
              
                    text: dataFromServer.data.roomPlayers[userId].username,
                  },
                  time: time,
                  userName: dataFromServer.data.roomPlayers[userId].username
                })
              })
            }
          })

          setPlayersTokens(playerTokens);
        }
      }
    };
  }

  const startGame = (startTime) => {
    waitingUserTimeCountDown(startTime);
  }

  // const handleWindowResize = () => {
  //   const htmlWrapper = document.getElementById('line-chart');
  //   if (!htmlWrapper || !chartWrapper) return;
  //   chartWrapper.resize(htmlWrapper.clientHeight, htmlWrapper.clientWidth);
  // }

  const fetchApiData = async () => {
    const cryptoData = await getCryptoData();
    if (cryptoData.length > 0) {
      let prices = [];
      let dates = [];
      cryptoData.forEach(item => {
        prices.push(item.value);
        dates.push(item.time);
      })
      const lastPrice = cryptoData[cryptoData.length-1].value ? cryptoData[cryptoData.length-1].value: -200000;
      const graphData = {
        ...chartProps.graphData,
        dates,
        prices,
        lastPrice
      }
      
      chartData.current = graphData;
      setChartProps({
        ...chartProps,
        graphData
      })
      // lineSeries.current.setData(cryptoData);
    }
  };

  const waitingUserTimeCountDown = (startTime) => {
    if (startTime < 1) {
      clearInterval(waitingTimerId.current);
      gamePlayTimeCountDown();
    } else {
      setWaitingTime(startTime);
      waitingTimerId.current = setInterval(()=> {
        setWaitingTime((t)=> t-1);
      }, 1000);
    }
  }

  const gamePlayTimeCountDown = () => {
    gamePlayTimeId.current = setInterval(()=> {
      setGameTime((t)=>t-1);
    }, 1000);
  }

  const onClickTakeWin = async () => {

    if (takeTokenCount.current < 1) {
      setErrorShow({show:true, message: 'There is no Token', type: 'warning'});
      return;
    }

    const currentDate = chartData.current.dates[chartData.current.dates.length-1];
    const currentPrice = chartData.current.prices[chartData.current.prices.length-1];

    const saveData = await setGameScore({
      roomId : playRoom.id,
      score: currentPrice,
      playerName: userInfo.name
    });

    if (saveData) {
      takeTokenCount.current -= 1;
      client.send(JSON.stringify({
        type: "contentchange",
        roomId : playRoom.id,
        userName: userInfo.name,
        tokenTime: currentDate,
        tokenPrice: currentPrice
      }));
    }
    else setErrorShow({show:true, message: 'Your score did not update! Try again.', type: 'error'});
  }

  const handlePauseGame = () => {
    setGamePauseDialogShow(true);
  }
  const handlePauseGameModalClose = () => {
    setGamePauseDialogShow(false);
  }

  const handleOnClickUser = (userName) => {
    if (userName !== userInfo.name) {
      setSendingMessageUser(userName);
      setMessageUIOpen(true);
    }
  }

  const closeChatUI = () => {
    setMessageUIOpen(false);
  }
  const sendMessage = (message) => {
    console.log('sendMessage', message);
    client.send(JSON.stringify({
      type: "messageChange",
      roomId : playRoom.id,
      userName: userInfo.name,
      sendUserName: sendingMessageUser,
      message
    }));
  }

  let tmpGameTime = gameTime > totalGameTime ? totalGameTime : gameTime;
  const min = Math.floor(tmpGameTime / 60);
  const sec = tmpGameTime - 60 * min;
  let gamePlayMin = min;
  let gamePlaySec = sec;
  if(sec < 10) gamePlaySec = `0${sec}`;
  if(min < 10) gamePlayMin = `0${min}`

  return (
    <div className={classes.container} >
      <div className={classes.headerBar}>
        <div className={classes.userStakeInfoStyle}>
          <p>{`Stake : $ ${gameBetCoin}`}</p>
        </div>
        <div className={classes.jackpotInfoStyle}>
          <p>{`Jackpot : $ ${jackPot}`}</p>
        </div>
        <div className={classes.pauseGameStyle} onClick={()=> handlePauseGame()}>
          <img src={PauseImage}/>
        </div>
      </div>
      <div className={classes.tradingView}>
        <div className={classes.graphView}>
          <CustomLineChart chartProps={chartProps} playerTokens={playersTokens}/>
        </div>
        <div className={classes.gameTime}>
          <img src={ClockImage}/>
          <p>{`${gamePlayMin}:${gamePlaySec}`}</p>
        </div>
        <div className={classes.takeWinStyle}>
          <CustomButton
            onClick={onClickTakeWin} 
            width={'10vw'}
            height={'4vw'} 
            label="TAKE WIN"/>
        </div>
      </div>
      <div className={classes.joinedUserList}>
        {
          currentPlayers.map((item, index) => (
            <div key={index} className={classes.joinedUserStyle} onClick={()=> handleOnClickUser(item)}>
              <img src={`/Users/user${index+1}.png`} />
              <p>{item}</p>
            </div>
          ))
        }
      </div>
      {
        messageUIOpen &&
          <div className={classes.chatUI}>
            <div className={classes.closeUI}>
              <p>{`Chatting With ${sendingMessageUser} ....`}</p>
              <IconButton onClick={closeChatUI}>
                <CloseIcon />
              </IconButton>
            </div>
            <ChatUI 
              avatarUrl='./Users/user1.png' 
              avatarUrlBot ='./Users/user2.png'
              newMessages={chatMessages}
              sendMessage={sendMessage}
              userName={userInfo.name}
              receiveUser={sendingMessageUser}/>
          </div>
      }
      {
        waitingTime > 0 &&
        <div className={classes.waitingScreenStyle}>
          <p>Waiting Users...</p>
          <p>{waitingTime}</p>
        </div>
      }
      <CustomAlert 
        title={errorShow.message}
        open={errorShow.show}
        handleClose={()=>setErrorShow(false)}
        type={errorShow.type}/>
      <WinnerModal
        opened={gameWinDialogShow}
        jackPot={jackPot}
      />
      <LoserModal
        opened={gameLoseDialogShow}
      />
      <PauseModal
        opened={gamePauseDialogShow}
        close={handlePauseGameModalClose}
      />
    </div>
  );
}

MainGameScreen.propTypes = {
  setTradeToken: PropTypes.func.isRequired,
  paymentInfo: PropTypes.object,
  history: PropTypes.object.isRequired,
  userInfo: PropTypes.object.isRequired,
  buyInStacke: PropTypes.func.isRequired,
  createRoom: PropTypes.func.isRequired,
  joinRoom: PropTypes.func.isRequired,
  getAcitveRoom: PropTypes.func.isRequired,
  playRoom: PropTypes.object.isRequired
};

MainGameScreen.defaultProps = {
  paymentInfo: {}
};

const mapStateToProps = (store) => ({
  paymentInfo: store.paymentData.paymentInfo,
  userInfo: store.userData.userInfo,
  playRoom: store.gamePlayData.playRoom
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  setTradeToken,
  buyInStacke,
  createRoom,
  joinRoom,
  getActiveRoom
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(MainGameScreen);
