"""Bound injected FTPS sessions before operations; never retry an uncertain command. No login or authorization."""
from __future__ import annotations
import ftplib,re,time


class BoundedStagingFTPS:
    def __init__(self, factory, transfer_limit=16, command_limit=128, idle_limit=60, clock=time.monotonic):
        if not callable(factory) or not callable(clock) or type(transfer_limit) is not int or not 1 <= transfer_limit <= 32 or type(command_limit) is not int or not 1 <= command_limit <= 512 or type(idle_limit) is not int or not 1 <= idle_limit <= 300:
            raise ValueError('Explicit bounded FTPS session factory required')
        self.factory, self.clock = factory, clock
        self.transfer_limit, self.command_limit, self.idle_limit = transfer_limit, command_limit, idle_limit
        self.connection = None
        self.commands = self.transfers = self.opened = self.total_commands = self.total_transfers = 0
        self.last_operation = None
        self.failed = self.closed = False

    def invoke(self, method, args, transfer=False, missing_read=None):
        if self.closed or self.failed:
            raise RuntimeError('FTPS session is closed or uncertain; explicit new caller inspection required')
        started = False
        try:
            now = self.clock()
            if self.connection is not None and (self.transfers >= self.transfer_limit or self.commands >= self.command_limit or now - self.last_operation >= self.idle_limit):
                self.connection.close()
                self.connection = None
            if self.connection is None:
                self.connection = self.factory()
                self.opened += 1
                self.commands = self.transfers = 0
            self.commands += 1
            self.total_commands += 1
            if transfer:
                self.transfers += 1
                self.total_transfers += 1
            # Evaluate lazy MLSD within this same operation so a partial directory read cannot escape uncertainty.
            started = True
            result = getattr(self.connection, method)(*args)
            if method == 'mlsd':
                result = list(result)
            self.last_operation = self.clock()
            return result
        except Exception as error:
            # A definite RETR absence before any data is the existing caller's normal missing-file result.
            # A partial read or any failed mutation remains uncertain and is never retried here.
            if started and method == 'retrbinary' and missing_read is not None and isinstance(error, ftplib.error_perm) and re.match(r'^550(?:[ -]|$)', str(error)) and missing_read():
                self.last_operation = self.clock()
            else:
                self.failed = True
            raise

    def retrbinary(self, command, callback):
        delivered = False
        def receive(data):
            nonlocal delivered
            delivered = True
            callback(data)
        return self.invoke('retrbinary', (command, receive), transfer=True, missing_read=lambda: not delivered)

    def storbinary(self, command, stream):
        return self.invoke('storbinary', (command, stream), transfer=True)

    def mlsd(self, directory):
        return self.invoke('mlsd', (directory,), transfer=True)

    def sendcmd(self, command):
        return self.invoke('sendcmd', (command,))

    def rename(self, source, destination):
        return self.invoke('rename', (source, destination))

    def delete(self, path):
        return self.invoke('delete', (path,))

    def rmd(self, path):
        return self.invoke('rmd', (path,))

    def statistics(self):
        return {'connectionsOpened': self.opened, 'commandsStarted': self.total_commands,
                'dataTransfersStarted': self.total_transfers, 'transferLimit': self.transfer_limit,
                'commandLimit': self.command_limit, 'idleLimitSeconds': self.idle_limit,
                'uncertainOperation': self.failed, 'automaticRetries': 0}

    def close(self):
        self.closed = True
        if self.connection is not None:
            self.connection.close()
            self.connection = None
