import { useLocation, useNavigate } from "react-router-dom"
import { useState, useCallback, useEffect, useRef } from "react";
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import axios from "axios";
import "../../../css/CompetitionPlay.css";
import C_playDividingLine from "./C_playDividingLine";
import { useSelector } from "react-redux";
import Editor from '@monaco-editor/react'

export default function CompPlayProblem({  }) {
  const Location = useLocation();
  const navigate = useNavigate();
  const sender = useRef(useSelector(state => state.auth.userNickname));

  const [code, setCode] = useState('')
  const [lang, setLang] = useState('')
  const [cateList, setCateList] = useState(["PD", "구현", "그리디", "매개변수 탐색", "문자열","수학", "시뮬레이션", "완전탐색", "이분탐색", "자료구조"])
  const [selectedList, setSelectedList] = useState([])
  const [cate, setCate] = useState('선택')
  const [problem, setProblem] = useState({})
  const [gameMode, setGameMode] = useState("");
  const [problemId, setProblemId] = useState(""); 
  const [userId, setUserId] = useState("");
  const [gameId, setGameId] = useState(""); 
  const [currentLangPkg, setCurrentLangPkg] = useState(null);
  const [stompClient, setStompClient] = useState();

  // 제한시간 1시간 타이머
  const [timer, setTimer] = useState(3600);
  const [timerDisplay, setTimerDisplay] = useState("1:00:00");
  // 제한시간 종료 관리 state
  const [timerExpired, setTimerExpired] = useState(false);
  
  // 구분선에 따른 화면 비율 조정 -> 초기는 5:5 비율로 문제와 코드블럭 보기
  const [panelWidths, setPanelWidths] = useState({
    left: 50,
    right: 50,
  });

  // 구분선 이동에 따른 왼쪽과 오른쪽 패널 비율 조정
  const handleDividerMoving = (newPosition) => {
      const leftPanelWidth = Math.min(Math.max(newPosition, 5), 95);
      const rightPanelWidth = 100 - leftPanelWidth;

      // 비율 유지를 위해 스타일에 적용
      setPanelWidths({ left: leftPanelWidth, right: rightPanelWidth });
  };

  const onChangeCode = useCallback((code) => {
    setCode(code);
  }, []);
  
  useEffect(()=> {
    console.log(Location.state);
    const { problemId, gameMode, lang, userId, gameId } = Location.state;
    console.log("문제 번호 확인 :", problemId)
    // setGameMode
    setGameMode(gameMode);
    setProblemId(problemId);
    setLang(lang);
    setUserId(userId);
    setGameId(gameId);
    if(lang === 'java'){
      setCurrentLangPkg(currentLangPkg);
      setCode('import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // 여기에 코드를 작성해주세요.\n    }\n}');
    }else if(lang === 'python'){
      setCurrentLangPkg(currentLangPkg);
      setCode('');
    }else{
      setCurrentLangPkg(currentLangPkg);
      setCode('#include <iostream>\nusing namespace std;\n\nint main() {\n    // 여기에 코드를 작성해주세요.\n    return 0;\n}');
    }
    axios({
      method : 'get',
      url : `https://i10d211.p.ssafy.io/api/problem/${problemId}`,
    })
    .then((res)=> {
      console.log(res);
      setProblem(res.data.data)
    })
    .catch((err)=> {
      console.log(err);
    })

    const socket = new SockJS('https://i10d211.p.ssafy.io/game/ws-stomp');
    const stompClient = Stomp.over(socket);
    console.log("useEffect stompClient :", stompClient)

    stompClient.connect({}, () => {
      // 연결
      stompClient.subscribe('/sub/chat/room/'+`${gameId}`, (message) => {
        // 받은 메시지에 대한 처리
        console.log("메시지 받았나용");
        console.log(message);
        const data = JSON.parse(message.body);
        console.log(data);
        if(data.type === 'CONTINUE'){   
          alert(data.result);
        } else if(data.type === 'END'){
          alert(data.result);
          // 결과페이지로 넘어가는 로직
          // 같이 넘겨야하는게 gameId
          if (gameMode == 'speed') {
            if (!data.winner) {
              navigate(
                `/game-list/competition/compSpeedDraw/${gameId}`,
                { state: { gameId: gameId }
              });
            }
            else {
              navigate(
                `/game-list/competition/compSpeedResult/${gameId}`,
                { state: { gameId: gameId }
              });
            }
          } else {
            if (!data.winner) {
              navigate(
                `/game-list/competition/compEffiDraw/${gameId}`,
                { state: { gameId: gameId }
              });
            }
            else {
              navigate(
                `/game-list/competition/compEffiResult/${gameId}`,
                { state: { gameId: gameId }
              });
            }
          }
        } else if (data.type === 'TERMINATED') {
          if (gameMode == 'speed') {
            navigate(
              `/game-list/competition/compSpeedDraw/${gameId}`,
              { state: { gameId: gameId }
            });
          } else {
            if (!data.winner) {
              navigate(
                `/game-list/competition/compEffiDraw/${gameId}`,
                { state: { gameId: gameId }
              });
            } else {
              navigate(
                `/game-list/competition/compEffiResult/${gameId}`,
                { state: { gameId: gameId }
              });
            }
          }
        }
        
      });
      }, error => {
      // 에러
      console.error("채팅 연결 에러났음", error)
      alert("연결에 문제가 있습니다. 다시 시도해주세요.")
      // 필요한 경우 여기에서 재연결 로직을 구현
    });
    setStompClient(stompClient);
  },[]);

  const onClickCate = (e)=>{
    const arr = cateList
    const filtered = arr.filter((element) => element !== e.target.value);
    setCateList(filtered)
    const tmp = selectedList
    tmp.push(e.target.value)
    setSelectedList(tmp)
    setCate('선택')
  }
  
  const onClickSelected = (e)=>{
    const text = e.target.innerText.split("(")[0]
    const arr = selectedList
    const filtered = arr.filter((element) => element !== text);
    setSelectedList(filtered)
    const tmp = cateList
    tmp.push(text)
    setCateList(tmp)
  }

  const onClickHandler = (e) => {
    let url =  '';

    if(gameMode === 'speed'){
      console.log("제출해버렷!")
      url = `https://i10d211.p.ssafy.io/${lang}/judge/arena`
      fetch(url, {
        method : "POST",
        headers : {
          "Content-type" : "application/json"
        },
        body : JSON.stringify({
          problemId : problemId,
          code : code,
          gameType : 0
        })
      }).then(res => res.json())
      .then(json => {
        console.log("여기 보여야 됨 :", json.data)
        let msg = json.data.msg;
        msg = msg.replace(".", "");
        console.log("보내는 데이터 : ", {
          gameId: gameId,
          sender: sender.current,
          result : msg,
          mode: 'SPEED',
        })
        stompClient.send(`/pub/chat/submit`, {}, JSON.stringify({
          gameId: gameId,
          sender: sender.current,
          result : msg,
          mode: 'SPEED',
        }))        
      })
    }else{
      url = `https://i10d211.p.ssafy.io/game/rest/submit`
      console.log("여긴 효율전 전용이얌")
      fetch(url, {
        method : "POST",
        headers : {
          "Content-type" : "application/json"
        },
        body : JSON.stringify({
          problemId : problemId,
          code : code,
          userId : userId,
          gameId : gameId,
          submitLang : lang,
          gameType : 1
        })
      }).then(res => res.json)
      .then(json => {
        setTimerExpired(true);
        console.log("날라왔어여", gameId)
        stompClient.send(`/pub/chat/submit`, {}, JSON.stringify({
          gameId: gameId,
          sender: sender.current,
          mode: 'EFFI',
        }))
      })
    }
    
    console.log(code);
  }

  // 제한시간 1시간 타이머 useEffect
  useEffect(() => {
    console.log("게임모드 :", gameMode)
    console.log("게임아이디 :", gameId)
    const intervalId = setInterval(() => {
      // 매 초마다 타이머 업데이트
      setTimer((prevTimer) => {
        if (prevTimer === 0) {
          clearInterval(intervalId);
          // 타이머 만료 시 처리 (필요한 경우)
          setTimerExpired(true);
          stompClient.send(`/pub/chat/leave`, {}, JSON.stringify({
            gameId: gameId,
            userId: '',
            mode: gameMode == 'speed' ? '0' : '1',
            message: '시간 초과',
            sender: sender.current,
            type: 'TERMINATED',
          }));

          return 0;
        }
        return prevTimer -1;
      });
    }, 1000);

    // 컴포넌트가 언마운트되면 간격 정리
    return () => clearInterval(intervalId);
  }, [stompClient, gameMode]);

  useEffect(() => {
    // 타이머 값을 HH:MM:SS 형식으로 포맷
    const hours = Math.floor(timer / 3600);
    const minutes = Math.floor((timer % 3600) / 60);
    const seconds = timer % 60;

    const formattedTime = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    setTimerDisplay(formattedTime);
  }, [timer]);

  // useEffect(() => {
  //   if (timerExpired && stompClient) {
  //     stompClient.send(`/pub/chat/leave`, {}, JSON.stringify({
  //       gameId: gameId,
  //       userId: '',
  //       mode: gameMode == 'SPEED' ? '0' : '1',
  //       message: '시간 초과',
  //       sender: sender.current,
  //       type: 'TERMINATED',
  //     }));
  //   }
  // }, [timerExpired, stompClient]);

  return (
    <div className="flex w-full">
      <div className="left-panel ml-3 relative" style={{ width: `${panelWidths.left}%` }}>
        {/* 좌측 비율 */}
        <div className="leftUp drop-shadow-xl p-5">
          {/* 문제 제목 */}
          <h1 className="text-3xl mb-2 ">{problem.problemTitle}</h1>
        </div>
        {/* 해당 문제 내용들 */}
        <div className="leftDown drop-shadow-xl p-5 ">
          <div className="flex justify-center gap-5 drop-shadow-xl text-center mb-4">
            <div className="bg-rose-200 rounded-md p-2">
              <p>시간제한</p>
              <p>{problem.problemTime}ms</p>
            </div>
            <div className="bg-rose-200 rounded-md p-2">
              <p>메모리제한</p>
              <p>{problem.problemMem}MB</p>
            </div>
          </div>
          <p className="text-xl">내용</p>
          <p>{problem.problemContent}</p>
          <hr className="my-2" />
          <p className="text-xl">입력</p>
          <p>{problem.problemInputDesc}</p>
          <hr className="my-2"  />
          <p className="text-xl">출력</p>
          <p>{problem.problemOutputDesc}</p>
          <hr className="my-2"  />
          <div className="grid grid-cols-2 w-full gap-4">
            <div>
              <p className="text-xl">입력예제</p>
              <Editor
                options={{'readOnly':true, 'minimap':{enabled:false}}}
                height={`${problem?.problemExInput?.split('\n').length * 19}px`}
                value={problem.problemExInput}
                onChange={onChangeCode}
              />
            </div>
            <div>
              <p className="text-xl">출력예제</p>
              <Editor
                options={{'readOnly':true, 'minimap':{enabled:false}}}
                height={`${problem?.problemExInput?.split('\n').length * 19}px`}
                value={problem.problemExOutput}
                onChange={onChangeCode}
              />
            </div>
          </div>

        </div>
      </div>

      {/* 구분선을 기준으로 왼쪽(5):오른쪽(5)로 나누어져있음 */}
      {/* handleDividerMoving 함수를 통해 왼쪽과 오른쪽 화면 비율 조정 */}
      <div className="relative">
        <C_playDividingLine onDivider_Moving={handleDividerMoving}/>
      </div>

      {/* 우측 비율 */}
      <div
        className="right-panel right drop-shadow-xl p-5 sticky mr-3"
        style={{ width: `${panelWidths.right}%` }}
      >
        <div className="flex justify-between">
          <div>
            <label className="font-bold mt-1 mr-2">언어</label>
            <select value={lang} onChange={(e)=>{setLang(e.target.value)}} className=" mb-2 select select-sm select-bordered" >
              <option>{lang}</option>
            </select>
          </div>
          {/* 제한시간 1시간 타이머 띄우기 */}
          <div className="text-2xl text-center font-bold">{timerDisplay}</div>
        </div>
        
        <Editor options={{'scrollBeyondLastLine': false, 'minimap':{enabled:false}}} value={code} height="75vh" language={lang} onChange={onChangeCode} />
        <div className="flex justify-end">
          <button onClick={onClickHandler} className="mt-1 btn btn-sm btn-neutral rounded-full z-10">제 출</button>
        </div>
      </div>
    </div>
  );
}