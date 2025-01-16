'use client';

import { ActionIcon, AppShell, Button, Center, ColorInput, Flex, Group, Modal, NumberInput, Paper, Tooltip, LoadingOverlay, Chip, Space } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { RefObject, useEffect, useState } from "react"
import { IconAdjustments, IconAppWindow } from '@tabler/icons-react';
import Note from "./note";

interface AppProps{
    readonly: boolean,
    setContentRef: RefObject<(content: string, insertAt: number) => void>,
    onChange: (content: string) => void,
    getContentRef: RefObject<() => string>
}

export default function App({readonly, getContentRef, onChange, setContentRef}: AppProps) {
    const [backgroundColor, setBackgroundColor] = useState("#272727");
    const [fontSize, setFontSize] = useState<string | number>(22);
    const [foregroundColor, setForegroundColor] = useState("white")
    const [loaded, setLoaded] = useState(false)
    const [twitchAuth, setTwitchAuth] = useState<Twitch.ext.Authorized | undefined>()
    const [noteReady, setNoteReady] = useState(false);

    useEffect(() => {
        window.Twitch.ext.onAuthorized((auth: Twitch.ext.Authorized) => {
            setLoaded(true)
            setTwitchAuth(auth)
        })
    }, [])

    useEffect(() => {
        const r = parseInt(backgroundColor.substring(1, 3), 16)
        const g = parseInt(backgroundColor.substring(3, 5), 16)
        const b = parseInt(backgroundColor.substring(5, 7), 16)
        const flipYs = 0.342
        const trc = 2.4, Rco = 0.2126729, Gco = 0.7151522, Bco = 0.0721750
        const Ys = (r / 255.0) ** trc * Rco + (g / 255.0) ** trc * Gco + (b / 255.0) ** trc * Bco
        setForegroundColor(Ys < flipYs ? 'white' : 'black')
    }, [backgroundColor])

    const [preferences, { open: openPreferences, close: closePreferences }] = useDisclosure(false);
    const [enableEmotes, setEnableEmotes] = useState(true);
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        if(acknowledged) {
            localStorage.setItem("notepadBackgroundColor", backgroundColor)
            localStorage.setItem("notepadAcknowledged", String(acknowledged))
            localStorage.setItem("notepadFontSize", String(fontSize))
            localStorage.setItem("notepadBackgroundColor", String(backgroundColor))
            localStorage.setItem("notepadEnableEmotes", String(enableEmotes))
        }
    }, [enableEmotes, acknowledged, fontSize, backgroundColor])

    useEffect(() => {
        setBackgroundColor(localStorage.getItem('notepadBackgroundColor')  || "#272727")
        setFontSize(Number(localStorage.getItem('notepadFontSize')) || 22)
        setEnableEmotes(!(localStorage.getItem('notepadEnableEmotes') !== undefined && localStorage.getItem('notepadEnableEmotes') === "false"))
        setAcknowledged((localStorage.getItem('notepadAcknowledged') !== undefined && localStorage.getItem('notepadAcknowledged') === "true"))
      }, []);

    return (
        <>
            {!acknowledged ?
                <Modal title="Acknowledgment" opened={preferences} onClose={closePreferences}>
                    <Center>In access adjust preferences you need to allow us to store their value in your browsers local storage. </Center>
                    <Space h="md"></Space>
                    <Center><Button onClick={() => {
                        setAcknowledged(true)
                    }}>
                        Accept local storage
                    </Button></Center>
                </Modal> :
                <Modal opened={preferences} onClose={closePreferences} title="Preferences">
                    <Flex
                        direction="column"
                        gap="md"
                    >
                        <Paper style={{ backgroundColor, color: foregroundColor, fontFamily: 'Consolas', fontSize, overflow: 'hidden' }} p="md" h={100} withBorder>
                            This is a preview of your notepad
                        </Paper>
                        <ColorInput
                            label="Background color"
                            defaultValue={backgroundColor}
                            onChange={setBackgroundColor}
                        />
                        <NumberInput
                            label="Font size"
                            min={8}
                            max={50}
                            defaultValue={fontSize}
                            onChange={setFontSize}
                        >
                        </NumberInput>
                        <Center>
                            <Chip checked={enableEmotes} onChange={() => setEnableEmotes((v) => !v)}>
                                Enable Emotes
                            </Chip>
                        </Center>
                        <Center>
                            <Button onClick={() => {
                                setFontSize(22)
                                setBackgroundColor("#272727")
                                setEnableEmotes(true)
                            }} variant="light">
                                Reset to default
                            </Button>
                        </Center>
                    </Flex>
                </Modal>}
            <AppShell header={{ height: 60 }}>
                <LoadingOverlay visible={!loaded || !noteReady} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                <AppShell.Header p='md'>
                    <Group justify="space-between">
                        <Tooltip label="Popout">
                            <ActionIcon variant="subtle" aria-label="popout" disabled>
                                <IconAppWindow stroke={2.0} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Preferences">
                            <ActionIcon variant="subtle" aria-label="preferences" onClick={openPreferences}>
                                <IconAdjustments stroke={2.0} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </AppShell.Header>
                <AppShell.Main bg={backgroundColor}>
                    {twitchAuth ?
                        <Note getContentRef={getContentRef} setContentRef={setContentRef} onChange={onChange} readonly={readonly} enableEmotes={enableEmotes} fontSize={fontSize + "px"} backgroundColor={backgroundColor} color={foregroundColor} twitchAuth={twitchAuth} setReady={setNoteReady}></Note>
                        : <></>}
                </AppShell.Main>
            </AppShell ></>
    )
}