import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles'
import { pink, green, red } from '@material-ui/core/colors'
import Grid from '@material-ui/core/Grid'
import Paper from '@material-ui/core/Paper'
import Button from '@material-ui/core/Button'
import CircularProgress from '@material-ui/core/CircularProgress'
import BathtubIcon from '@material-ui/icons/Bathtub'
import PanToolIcon from '@material-ui/icons/PanTool'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogActions from '@material-ui/core/DialogActions'
import { CRC } from 'crc-full'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      paddingTop: '20px',
      display: 'flex',
      alignItems: 'center',
    },
    paper: {
      padding: theme.spacing(2),
      margin: theme.spacing(1),
      width: theme.spacing(36),
    },
    button: {
      '& > *': {
        marginRight: theme.spacing(2),
      },
    },
    buttonProgress: {
      // default secondary color
      color: pink.A400,
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -12,
      marginLeft: -12,
    },
    startButtonSuccess: {
      backgroundColor: green[500],
      '&:hover': {
        backgroundColor: green[700],
      },
    },
    startButtonFailure: {
      backgroundColor: red[500],
      '&:hover': {
        backgroundColor: red[700],
      },
    },
    quickStartButton: {
      textTransform: 'none',
    }
  }),
)

const App = () => {
  const classes = useStyles()
  const [inProgress, setInProgress] = useState(false)
  // percentage:
  // -1 -> indeterminate
  // 0 to 100 -> determinate
  const [percentage, setPercentage] = useState(0)
  // success & failure: indicates the color of start button
  const [success, setSuccess] = useState(false)
  const [failure, setFailure] = useState(false)
  // errorMsg: error messages in pop-up dialog
  const [errorMsg, setErrorMsg] = useState("")

  const [supportsQuickStart, setSupportsQuickStart] = useState(false)
  useEffect(() => {
    if (navigator.bluetooth.getDevices !== undefined) setSupportsQuickStart(true)
  }, [])

  const [lastDeviceName, setLastDeviceName] = useState("")
  useEffect(() => {
    let _lastDeviceName = localStorage.getItem("lastDeviceName")
    if (_lastDeviceName != null) setLastDeviceName(_lastDeviceName)
  }, [])

  const [gattServer, setGattServer] = useState(Object)
  const [characteristic, setCharacteristic] = useState(Object)

  const startButtonClassname = clsx({
    [classes.startButtonSuccess]: success,
    [classes.startButtonFailure]: failure,
  })

  const handleStartButtonClick = () => {
    if (!inProgress) {
      setErrorMsg("")
      setSuccess(false)
      setFailure(false)
      setInProgress(true)
      setPercentage(-1)

      bluetoothStart()
        .then(_ => {
          setSuccess(true)
          setInProgress(false)
        })
        .catch((error) => handleBluetoothError(error))
    }
  }

  const handleQuickStartButtonClick = () => {
    if (!inProgress) {
      setErrorMsg("")
      setSuccess(false)
      setFailure(false)
      setInProgress(true)
      setPercentage(-1)

      bluetoothStart(lastDeviceName)
        .then(_ => {
          setSuccess(true)
          setInProgress(false)
        })
        .catch((error) => handleBluetoothError(error))
    }
  }

  const handleEndButtonClick = () => {
    // Always run BluetoothEnd() and reset the color of start button
    bluetoothEnd()
    setSuccess(false)
    setFailure(false)
  }

  const logProgress = (x: any) => {
    console.log("Current:", x)
    return x;
  }

  // Bluetooth control begins
  const bluetoothStart = async (deviceName: string | undefined = undefined) => {
    // BLE device (a.k.a peripheral) => GATT server => service => characteristic => writeValue()
    // Step 1/5
    let bluetoothDevice
    if (deviceName === undefined)
      bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "Water" }],
        optionalServices: [0xF1F0]
      })
    else {
      const allDevices = await navigator.bluetooth.getDevices()
      for (const device of allDevices) {
        if (device.name === lastDeviceName) bluetoothDevice = device
      }
      if (bluetoothDevice === undefined) throw new Error("Quick start failed")
    }
    logProgress(bluetoothDevice)
    localStorage.setItem("lastDeviceName", bluetoothDevice.name!);
    setPercentage(20)
    // Step 2/5
    let gattServer = await bluetoothDevice.gatt!.connect()
    setGattServer(gattServer)
    logProgress(gattServer)
    setPercentage(40)
    // Step 3/5
    let service = await gattServer.getPrimaryService(0xF1F0)
    logProgress(service)
    setPercentage(60)
    // Step 4/5
    // Target characteristic name = TXD, uuid = 0xF1F1
    let characteristic = await service.getCharacteristic(0xF1F1)
    setCharacteristic(characteristic)
    logProgress(characteristic)
    setPercentage(80)
    // Step 5/5
    // Generate device name checksum and fill into payload
    // A custom CRC-16. I'll call it... CRC-16/ChangGong
    let crc16cg = new CRC("CRC16", 16, 0x8005, 0xE808, 0x0000, true, true)
    let enc = new TextEncoder();
    let checksum = crc16cg.compute(Array.from(enc.encode(bluetoothDevice.name!.slice(-5)))).toString(16)
    // Flip the two bytes. Sorry for the dirty hack.
    let checksumByteOne = parseInt("0x" + checksum.slice(2, 4))
    let checksumByteTwo = parseInt("0x" + checksum.slice(0, 2))
    const startPayload = new Uint8Array([0xFE, 0xFE, 0x09, 0xB2, 0x01, checksumByteOne, checksumByteTwo, 0x00, 0x70, 0xE2, 0xEB, 0x20, 0x01, 0x01, 0x00, 0x00, 0x00, 0x6C, 0x30, 0x00])
    console.log("Writing: ", startPayload)
    await characteristic.writeValue(startPayload)
    setPercentage(100)
  }

  const bluetoothEnd = async () => {
    const endPayload = new Uint8Array([0xFE, 0xFE, 0x09, 0xB3, 0x00, 0x00])
    console.log("Writing: ", endPayload)
    await characteristic.writeValue(endPayload)
    await gattServer.disconnect()
  }

  const handleBluetoothError = (error: { toString: () => string }) => {
    setInProgress(false)
    if (error.toString().match(/User cancelled/))
      return // User's cancellation won't be considered as an error

    setFailure(true)
    if (!navigator.bluetooth || error.toString().match(/Bluetooth adapter not available/))
      setErrorMsg("找不到蓝牙硬件，或浏览器不支持。\n\n限于篇幅，详情请参考下方“疑难解答”。")
    else if (error.toString().match(/User denied the browser permission/))
      setErrorMsg("蓝牙权限遭拒。\n\n请前往手机设置，授予浏览器“位置信息”权限。\n此权限不会用于定位，详情请参考下方“疑难解答”。")
    else if (error.toString().match(/NetworkError/))
      setErrorMsg("连接不稳定，无法与水控器建立连接。\n请重试。")
    else if (error.toString().match(/Quick start failed/))
      setErrorMsg("快速启动暂不好使。\n请点击“启动”，重新开始。")
    else
      setErrorMsg("未知错误：\n" + error.toString() + "\n\n这可能是一个Bug，请截图并反馈给开发者。")
  }

  return (
    <div className={classes.root}>
      {errorMsg && <ErrorDialog errorDescription={errorMsg} />}
      <Grid container direction="column" justify="flex-start" alignItems="center">

        {/* Main control panel */}
        <Grid item>
          <Paper className={classes.paper}>
            <div className={classes.button}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<BathtubIcon />}
                className={startButtonClassname}
                disabled={inProgress}
                onClick={handleStartButtonClick}>
                启动
                {inProgress && percentage < 0 && <CircularProgress size={24} className={classes.buttonProgress} />}
                {inProgress && percentage >= 0 && <CircularProgress size={24} className={classes.buttonProgress} variant="determinate" value={percentage} />}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PanToolIcon />}
                onClick={handleEndButtonClick}>
                结束
              </Button>
            </div>
          </Paper>
        </Grid>
        {supportsQuickStart && lastDeviceName !== "" &&
          <Grid item>
            <Paper className={classes.paper}>
              <div className={classes.button}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<BathtubIcon />}
                  className={classes.quickStartButton}
                  disabled={inProgress}
                  onClick={handleQuickStartButtonClick}>
                  快速启动：{lastDeviceName}
                </Button>
              </div>
            </Paper>
          </Grid>}


        {/* Credits */}
        <Grid item>
          <Paper className={classes.paper}>
            <div className={classes.button}>
              <Button variant="outlined" href="https://github.com/celesWuff/waterctl/blob/master/FAQ.md">
                疑难解答
              </Button>
              <Button variant="outlined" href="https://github.com/celesWuff/waterctl">
                源代码
              </Button>
            </div>
          </Paper>
        </Grid>

      </Grid>
    </div>
  )
}

const ErrorDialog = (props: { errorDescription: string }) => {
  const [open, setOpen] = useState(true)

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <Dialog style={{ whiteSpace: "pre-wrap" }}
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {props.errorDescription}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary" autoFocus>
          好
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default App
