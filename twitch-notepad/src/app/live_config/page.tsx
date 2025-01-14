'use client';

import { Image, ActionIcon, AppShell, Burger, Button, Center, ColorInput, Container, Flex, Group, Modal, NumberInput, Space, Paper, Tooltip, LoadingOverlay } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react"
import { IconAdjustments, IconAppWindow, IconAppWindowFilled } from '@tabler/icons-react';
import Note from "./note";

interface VideoComponentProps {
    name: string;
}

export default function VideoComponent({ name }: VideoComponentProps) {
    const [channelId, setChannelId] = useState<string | null>(null);
    const [backgroundColor, setBackgroundColor] = useState("#272727");
    const [fontSize, setFontSize] = useState<string | number>(22);
    const [foregroundColor, setForegroundColor] = useState("white")
    const [loaded, setLoaded] = useState(false)
    const [twitchAuth, setTwitchAuth] = useState<Twitch.ext.Authorized | undefined>()
    const noteRef = useRef<HTMLDivElement | null>(null)


    useEffect(() => {
        console.log("adding callback", window.Twitch.ext)
        window.Twitch.ext.onAuthorized((auth: Twitch.ext.Authorized) => {
            setChannelId(auth.channelId)
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
        console.log(Ys < flipYs ? 'white' : 'black', backgroundColor)
        setForegroundColor(Ys < flipYs ? 'white' : 'black')
    }, [backgroundColor])

    useEffect(() => {
        console.log("Channel id ", channelId)
    }, [channelId])

    const [opened, { open, close }] = useDisclosure(false);

    useEffect(() => {

    }, [opened])

    return (
        <>
            <Modal opened={opened} onClose={close} title="Preferences">
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
                        <Button onClick={() => {
                            setFontSize(22)
                            setBackgroundColor("#272727")
                        }}>
                            Reset to default
                        </Button>
                    </Center>
                </Flex>
            </Modal>
            <AppShell header={{ height: 60 }}>
                <LoadingOverlay visible={!loaded} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                <AppShell.Header p='md'>
                    <Group justify="space-between">
                        <Tooltip label="Popout">
                            <ActionIcon variant="subtle" aria-label="popout" disabled>
                                <IconAppWindow stroke={2.0} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Preferences">
                            <ActionIcon variant="subtle" aria-label="preferences" onClick={open}>
                                <IconAdjustments stroke={2.0} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </AppShell.Header>
                <AppShell.Main>
                    {twitchAuth ?
                        <Note fontSize={fontSize + "px"} backgroundColor={backgroundColor} color={foregroundColor} twitchAuth={twitchAuth}></Note>
                        : <></>}
                </AppShell.Main>
            </AppShell ></>
    )
}