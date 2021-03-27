import React from 'react'
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
  }),
)

// Abandoned planned feature: auto start the last connected device
// Due to the lack of implementations of necessary APIs in Web Bluetooth
//
// const AutoStartPanel = () => {
//   const classes = useStyles()
//   // todo
//   let lastConnected = localStorage.getItem("lastConnected")
//   return
// }

const App = () => {
  const classes = useStyles()
  const [inProgress, setInProgress] = React.useState(false)
  // success & failure: indicates the color of start button
  const [success, setSuccess] = React.useState(false)
  const [failure, setFailure] = React.useState(false)
  // error: error messages in pop-up dialog
  const [error, setError] = React.useState("")
  const [gattServer, setGattServer] = React.useState(Object)
  const [characteristic, setCharacteristic] = React.useState(Object)
  const timer = React.useRef<number>()

  React.useEffect(() => {
    return () => {
      clearTimeout(timer.current)
    }
  }, [])

  const startButtonClassname = clsx({
    [classes.startButtonSuccess]: success,
    [classes.startButtonFailure]: failure,
  })

  const handleStartButtonClick = () => {
    if (!inProgress) {
      setError("")
      setSuccess(false)
      setFailure(false)
      setInProgress(true)
      bluetoothStart().catch((error) => handleBluetoothError(error))
      timer.current = window.setTimeout(() => {
        if (failure === false)
          setSuccess(true)
        setInProgress(false)
      }, 8000)
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
  const bluetoothStart = async () => {
    // BLE device (a.k.a peripheral) => GATT server => service => characteristic => writeValue()
    // Step 1/5
    let bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Water" }],
      optionalServices: [0xF1F0]
    })
    logProgress(bluetoothDevice)
    // Step 2/5
    let gattServer = await bluetoothDevice.gatt!.connect()
    setGattServer(gattServer)
    logProgress(gattServer)
    // Step 3/5
    let service = await gattServer.getPrimaryService(0xF1F0)
    logProgress(service)
    // Step 4/5
    // Target characteristic name = TXD, uuid = 0xF1F1
    let characteristic = await service.getCharacteristic(0xF1F1)
    setCharacteristic(characteristic)
    logProgress(characteristic)
    // Step 5/5
    const startPayload = new Uint8Array([0xFE, 0xFE, 0x09, 0xB2, 0x01, 0x2B, 0xDC, 0x00, 0x70, 0xE2, 0xEB, 0x20, 0x01, 0x01, 0x00, 0x00, 0x00, 0x6C, 0x30, 0x00])
    console.log("Writing: ", startPayload)
    await characteristic.writeValue(startPayload)
  }

  const bluetoothEnd = async () => {
    const endPayload = new Uint8Array([0xFE, 0xFE, 0x09, 0xB3, 0x00, 0x00])
    console.log("Writing: ", endPayload)
    await characteristic.writeValue(endPayload)
    await gattServer.disconnect()
  }

  const handleBluetoothError = (error: { toString: () => string }) => {
    if (error.toString().match(/User cancelled/))
      return // User's cancellation won't be considered as an error
      
    setFailure(true)
    if (!navigator.bluetooth)
      setError("找不到蓝牙硬件，或浏览器不支持。\n\n请参考下方“疑难解答”。")
    else if (error.toString().match(/User denied the browser permission/))
      setError("蓝牙权限遭拒。\n\n请前往手机设置，授予浏览器“位置信息”权限。\n此权限不会用于定位，详情请查看“疑难解答”。")
    else
      setError("未知错误：\n" + error.toString() + "\n\n这可能是一个Bug，请截图并反馈给开发者。")
  }


  return (
    <div className={classes.root}>
      {error && <ErrorDialog errorDescription={error} />}
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
              {inProgress && <CircularProgress size={24} className={classes.buttonProgress} />}
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
  const [open, setOpen] = React.useState(true)

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
